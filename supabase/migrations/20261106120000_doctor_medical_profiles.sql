-- MedEase: doctors read their patients' medical profiles (PRO-02). Safe to run
-- more than once. Run after the patient documents migration.
--
-- A doctor sees the medical profile (allergies, conditions, current medicines,
-- age, blood group...) of the person an appointment is for, so they can check it
-- before and during the visit and while prescribing. Booking shares it: any
-- appointment that wasn't cancelled opens it, including an upcoming one, and it
-- stays open for a doctor who has seen the person. A cancelled booking alone
-- opens nothing. Reads stay live, so the doctor sees the profile as the patient
-- keeps it now, not as it was at booking.
--
-- The restrictive second-factor policy on care_recipients still applies, and
-- writes still go only through save_patient_profile.

drop policy if exists "Doctors read their patients' medical profiles"
  on public.care_recipients;
create policy "Doctors read their patients' medical profiles"
  on public.care_recipients
  for select to authenticated
  using (
    exists (
      select 1 from public.appointments a
      where a.care_recipient_id = care_recipients.id
        and a.doctor_id = (select auth.uid())
        and a.status <> 'cancelled'
    )
  );
