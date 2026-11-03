-- MedEase: visit summaries (REC-01)
--
-- What the doctor tells the patient after a visit: a diagnosis, advice and an
-- optional follow-up date. It sits apart from appointment_notes, which stay the
-- doctor's alone. One summary per appointment; the doctor can rewrite it in the
-- same window as a prescription (from the start of the visit until 14 days after).

create table if not exists public.visit_summaries (
  appointment_id uuid primary key references public.appointments (id) on delete cascade,
  doctor_id uuid not null references public.doctor_profiles (id) on delete cascade,
  patient_id uuid not null references auth.users (id) on delete cascade,
  care_recipient_id uuid not null,
  diagnosis text check (char_length(diagnosis) between 1 and 200),
  advice text check (char_length(advice) between 1 and 2000),
  follow_up_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visit_summaries_not_empty
    check (diagnosis is not null or advice is not null or follow_up_on is not null),
  constraint visit_summaries_care_recipient_fkey
    foreign key (care_recipient_id, patient_id)
    references public.care_recipients (id, account_id)
    deferrable initially deferred
);

create index if not exists visit_summaries_patient_idx
  on public.visit_summaries (patient_id, created_at desc);
create index if not exists visit_summaries_doctor_idx
  on public.visit_summaries (doctor_id, created_at desc);
create index if not exists visit_summaries_care_recipient_idx
  on public.visit_summaries (care_recipient_id, created_at desc);

drop trigger if exists set_updated_at on public.visit_summaries;
create trigger set_updated_at before update on public.visit_summaries
  for each row execute function public.set_updated_at();

-- Read only: every write goes through save_visit_summary.
alter table public.visit_summaries enable row level security;
revoke all on public.visit_summaries from anon, authenticated;
grant select on public.visit_summaries to authenticated;
grant all on public.visit_summaries to service_role;

drop policy if exists "Patients and doctors read their visit summaries" on public.visit_summaries;
create policy "Patients and doctors read their visit summaries" on public.visit_summaries
  for select to authenticated
  using ((select auth.uid()) in (patient_id, doctor_id));

drop policy if exists "Clinical data needs a second factor" on public.visit_summaries;
create policy "Clinical data needs a second factor" on public.visit_summaries
  as restrictive
  for all to authenticated
  using ((select private.second_factor_ok()))
  with check ((select private.second_factor_ok()));

drop trigger if exists require_second_factor on public.visit_summaries;
create trigger require_second_factor
  before insert or update or delete on public.visit_summaries
  for each statement execute function private.require_second_factor();

-- Saving ---------------------------------------------------------------------------
-- Blank fields count as empty; a summary needs at least one of the three. The
-- follow-up date falls after the visit day (clinic time) and within a year of it.

create or replace function public.save_visit_summary(
  p_appointment_id uuid,
  p_diagnosis text default null,
  p_advice text default null,
  p_follow_up_on date default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_appointment public.appointments;
  v_diagnosis text := nullif(btrim(p_diagnosis), '');
  v_advice text := nullif(btrim(p_advice), '');
  v_visit_day date;
begin
  if v_uid is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'doctor' then
    raise exception 'not_doctor';
  end if;

  -- Locking the appointment makes concurrent saves for it take turns.
  select * into v_appointment from public.appointments
  where id = p_appointment_id and doctor_id = v_uid
  for update;

  if not found then
    raise exception 'appointment_not_found';
  end if;
  if v_appointment.status = 'cancelled' then
    raise exception 'appointment_cancelled';
  end if;
  if v_appointment.status = 'no_show' then
    raise exception 'appointment_no_show';
  end if;
  if v_appointment.starts_at > now() then
    raise exception 'summary_not_started';
  end if;
  if now() > v_appointment.starts_at + interval '14 days' then
    raise exception 'summary_window_closed';
  end if;

  v_visit_day := (v_appointment.starts_at at time zone v_appointment.timezone)::date;
  if (v_diagnosis is null and v_advice is null and p_follow_up_on is null)
    or char_length(v_diagnosis) > 200
    or char_length(v_advice) > 2000
    or p_follow_up_on <= v_visit_day
    or p_follow_up_on > v_visit_day + 365 then
    raise exception 'invalid_summary';
  end if;

  insert into public.visit_summaries (
    appointment_id, doctor_id, patient_id, care_recipient_id,
    diagnosis, advice, follow_up_on
  ) values (
    v_appointment.id, v_uid, v_appointment.patient_id, v_appointment.care_recipient_id,
    v_diagnosis, v_advice, p_follow_up_on
  )
  on conflict (appointment_id) do update
    set diagnosis = excluded.diagnosis,
        advice = excluded.advice,
        follow_up_on = excluded.follow_up_on
    -- Saving the same text again changes nothing and tells nobody.
    where (public.visit_summaries.diagnosis, public.visit_summaries.advice,
           public.visit_summaries.follow_up_on)
      is distinct from (excluded.diagnosis, excluded.advice, excluded.follow_up_on);
end;
$$;

revoke execute on function public.save_visit_summary(uuid, text, text, date) from public, anon;
grant execute on function public.save_visit_summary(uuid, text, text, date) to authenticated;

-- Telling the patient, and the audit trail ------------------------------------------

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in (
    'appointment_booked', 'appointment_new', 'appointment_cancelled',
    'appointment_reminder', 'prescription_issued', 'prescription_updated',
    'prescription_cancelled', 'verification_approved',
    'verification_needs_info', 'verification_rejected',
    'visit_summary_ready', 'visit_summary_updated'
  ));

create or replace function private.after_visit_summary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify(
    new.patient_id,
    case when tg_op = 'INSERT' then 'visit_summary_ready' else 'visit_summary_updated' end,
    '/patient/appointments'
  );
  perform private.write_audit(
    case when tg_op = 'INSERT' then 'visit_summary.written' else 'visit_summary.edited' end,
    'appointment',
    new.appointment_id
  );
  return null;
end;
$$;

revoke execute on function private.after_visit_summary() from public;

drop trigger if exists after_visit_summary on public.visit_summaries;
create trigger after_visit_summary
  after insert or update on public.visit_summaries
  for each row execute function private.after_visit_summary();
