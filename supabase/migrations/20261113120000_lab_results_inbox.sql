-- MedEase: the doctor's lab results inbox (PRC-11). Safe to run more than once.
-- Run after the LAB-08 migration (20261112150000_lab_order_results.sql).
--
-- Every report from tests a doctor ordered, across all visits, with the ones
-- still to review first. Review is kept per report version, so a corrected
-- report (LAB-18) comes back as one to review. Design: docs/lab-orders.md
-- ("Results inbox (PRC-11)").

-- Review per report version ----------------------------------------------------------
-- Set by review_lab_result on the current report. lab_result_reviews (one per
-- booking) keeps the comment the patient sees.

alter table public.lab_reports add column if not exists reviewed_at timestamptz;

-- Reports reviewed before this column existed.
update public.lab_reports r
set reviewed_at = v.reviewed_at
from public.lab_result_reviews v
where v.booking_id = r.booking_id
  and r.replaced_at is null
  and r.reviewed_at is null;

-- Only the ordering doctor learns when a report was reviewed, through the
-- functions below: patients and labs read every other column, as before.
revoke select on public.lab_reports from authenticated;
grant select (
  id, booking_id, lab_id, patient_id, care_recipient_id, version, storage_path,
  uploaded_by, created_at, replaced_at, ordering_doctor_id
) on public.lab_reports to authenticated;

-- One index per list, each in the list's order, so paging is an index seek.
-- The to-review set stays small however many reports a doctor has reviewed.
drop index if exists public.lab_reports_ordering_doctor_idx;

create index if not exists lab_reports_to_review_idx
  on public.lab_reports (ordering_doctor_id, created_at, id)
  where ordering_doctor_id is not null
    and replaced_at is null
    and reviewed_at is null;

create index if not exists lab_reports_reviewed_idx
  on public.lab_reports (ordering_doctor_id, reviewed_at desc, id desc)
  where ordering_doctor_id is not null
    and replaced_at is null
    and reviewed_at is not null;

-- Reviewing a result -----------------------------------------------------------------
-- As in LAB-08, and it marks the current report reviewed. Saving the same
-- comment again is quiet only once the current report is reviewed; on a
-- corrected report it records the new review. Latest version before this:
-- 20261112150000_lab_order_results.sql.

create or replace function public.review_lab_result(
  p_booking_id uuid,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_comment text := nullif(btrim(p_comment), '');
  v_booking public.lab_bookings;
  v_review public.lab_result_reviews;
  v_doctor_name text;
  v_unreviewed boolean;
  v_changed boolean;
begin
  if v_uid is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'doctor' then
    raise exception 'not_doctor';
  end if;
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;
  if char_length(v_comment) > 1000 then
    raise exception 'invalid_comment';
  end if;

  -- Locked, so two saves take turns and a report can't be replaced meanwhile.
  select b.* into v_booking
  from public.lab_bookings b
  join public.lab_orders o on o.id = b.lab_order_id
  where b.id = p_booking_id and o.doctor_id = v_uid
  for update of b;

  if not found then
    raise exception 'booking_not_found';
  end if;
  if v_booking.status <> 'report_ready' then
    raise exception 'report_not_ready';
  end if;

  select r.reviewed_at is null into v_unreviewed
  from public.lab_reports r
  where r.booking_id = v_booking.id and r.replaced_at is null;

  select * into v_review from public.lab_result_reviews
  where booking_id = v_booking.id;
  -- With no review yet every field is null, so this is "a comment was given".
  v_changed := v_review.comment is distinct from v_comment;

  if v_review.booking_id is null then
    select a.doctor_name into v_doctor_name
    from public.lab_orders o
    join public.appointments a on a.id = o.appointment_id
    where o.id = v_booking.lab_order_id;

    insert into public.lab_result_reviews (
      booking_id, doctor_id, patient_id, doctor_name, comment, commented_at
    ) values (
      v_booking.id, v_uid, v_booking.patient_id, v_doctor_name, v_comment,
      case when v_comment is not null then now() end
    );
    perform private.write_audit('lab_result.reviewed', 'lab_booking', v_booking.id);
  elsif not v_changed and not coalesce(v_unreviewed, false) then
    return;
  else
    update public.lab_result_reviews
    set comment = v_comment,
        commented_at = case
          when not v_changed then commented_at
          when v_comment is not null then now()
        end,
        reviewed_at = case when v_unreviewed then now() else reviewed_at end
    where booking_id = v_booking.id;
    if v_unreviewed then
      perform private.write_audit('lab_result.reviewed', 'lab_booking', v_booking.id);
    end if;
  end if;

  update public.lab_reports
  set reviewed_at = now()
  where booking_id = v_booking.id
    and replaced_at is null
    and reviewed_at is null;

  if v_changed and v_comment is not null then
    perform private.notify(v_booking.patient_id, 'lab_result_comment', '/patient/lab-tests');
  end if;
  if v_changed then
    perform private.write_audit('lab_result.commented', 'lab_booking', v_booking.id);
  end if;
end;
$$;

revoke execute on function public.review_lab_result(uuid, text) from public, anon;
grant execute on function public.review_lab_result(uuid, text) to authenticated;

-- The doctor's view of an order's bookings -------------------------------------------
-- As in LAB-08, except reviewed_at is the current report's, so a corrected
-- report shows as not reviewed. Latest version before this:
-- 20261112150000_lab_order_results.sql.

create or replace function public.get_lab_order_bookings(p_appointment_id uuid)
returns table (
  booking_id uuid,
  lab_name text,
  status text,
  collection text,
  visit_date date,
  slot_starts_at timestamptz,
  timezone text,
  ordered_test_ids text[],
  report_id uuid,
  report_published_at timestamptz,
  comment text,
  reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'doctor' then
    raise exception 'not_doctor';
  end if;
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;

  return query
  select
    b.id,
    b.lab_name,
    b.status,
    b.collection,
    b.visit_date,
    b.slot_starts_at,
    b.timezone,
    b.ordered_test_ids,
    r.id,
    r.created_at,
    v.comment,
    r.reviewed_at
  from public.lab_orders o
  join public.lab_bookings b on b.lab_order_id = o.id
  left join public.lab_reports r
    on r.booking_id = b.id and r.replaced_at is null
  left join public.lab_result_reviews v on v.booking_id = b.id
  where o.appointment_id = p_appointment_id
    and o.doctor_id = v_uid
    and b.status <> 'cancelled'
  order by b.created_at;
end;
$$;

revoke execute on function public.get_lab_order_bookings(uuid) from public, anon;
grant execute on function public.get_lab_order_bookings(uuid) to authenticated;

-- The inbox ------------------------------------------------------------------------------
-- One page of the doctor's current reports. To review: the one waiting longest
-- first, by (created_at, id). Reviewed: the latest review first, by
-- (reviewed_at desc, id desc). The cursor is the last row's pair, so each page
-- is a seek on its index; no OFFSET. Doctors can't read lab_bookings, which
-- hold the patient's address and payment, so this returns only what the inbox
-- shows. Times show in the doctor's timezone, the visit's.

drop function if exists public.get_lab_results_inbox(boolean, timestamptz, uuid, integer);

create or replace function public.get_lab_results_inbox(
  p_reviewed boolean,
  p_cursor_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 25
)
returns table (
  report_id uuid,
  booking_id uuid,
  appointment_id uuid,
  patient_name text,
  care_recipient_name text,
  care_recipient_relation text,
  lab_name text,
  collection text,
  visit_date date,
  timezone text,
  priority text,
  test_names text[],
  published_at timestamptz,
  version integer,
  reviewed_at timestamptz,
  comment text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 50);
  v_ids uuid[];
begin
  if v_uid is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'doctor' then
    raise exception 'not_doctor';
  end if;
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;
  if p_reviewed is null or (p_cursor_at is null) <> (p_cursor_id is null) then
    raise exception 'invalid_cursor';
  end if;

  -- The page's report ids, read from the list's index alone.
  if p_reviewed then
    select array_agg(s.id order by s.reviewed_at desc, s.id desc) into v_ids
    from (
      select r.id, r.reviewed_at
      from public.lab_reports r
      where r.ordering_doctor_id = v_uid
        and r.replaced_at is null
        and r.reviewed_at is not null
        and (r.reviewed_at, r.id) < (
          coalesce(p_cursor_at, 'infinity'),
          coalesce(p_cursor_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff')
        )
      order by r.reviewed_at desc, r.id desc
      limit v_limit
    ) s;
  else
    select array_agg(s.id order by s.created_at, s.id) into v_ids
    from (
      select r.id, r.created_at
      from public.lab_reports r
      where r.ordering_doctor_id = v_uid
        and r.replaced_at is null
        and r.reviewed_at is null
        and (r.created_at, r.id) > (
          coalesce(p_cursor_at, '-infinity'),
          coalesce(p_cursor_id, '00000000-0000-0000-0000-000000000000')
        )
      order by r.created_at, r.id
      limit v_limit
    ) s;
  end if;

  return query
  select
    r.id,
    b.id,
    o.appointment_id,
    a.patient_name,
    a.care_recipient_name,
    a.care_recipient_relation,
    b.lab_name,
    b.collection,
    b.visit_date,
    a.timezone,
    o.priority,
    array(
      select i.test_name
      from public.lab_order_items i
      where i.order_id = o.id and i.test_type_id = any (b.ordered_test_ids)
      order by i.test_name
    ),
    r.created_at,
    r.version,
    r.reviewed_at,
    v.comment
  from unnest(v_ids) with ordinality as page (id, n)
  join public.lab_reports r on r.id = page.id
  join public.lab_bookings b on b.id = r.booking_id
  join public.lab_orders o on o.id = b.lab_order_id
  join public.appointments a on a.id = o.appointment_id
  left join public.lab_result_reviews v on v.booking_id = b.id
  order by page.n;
end;
$$;

revoke execute on function public.get_lab_results_inbox(boolean, timestamptz, uuid, integer) from public, anon;
grant execute on function public.get_lab_results_inbox(boolean, timestamptz, uuid, integer) to authenticated;

-- How many reports are waiting, for the inbox tab and the overview. Counted on
-- lab_reports_to_review_idx.
create or replace function public.count_lab_results_to_review()
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'doctor' then
    raise exception 'not_doctor';
  end if;
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;

  return (
    select count(*)::integer
    from public.lab_reports r
    where r.ordering_doctor_id = v_uid
      and r.replaced_at is null
      and r.reviewed_at is null
  );
end;
$$;

revoke execute on function public.count_lab_results_to_review() from public, anon;
grant execute on function public.count_lab_results_to_review() to authenticated;
