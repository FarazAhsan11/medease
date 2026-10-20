# Prescriptions

Roadmap item 1 of Milestone 2. Doctors write prescriptions for their appointments; patients see them, follow their medicines day to day, and can print them.

## How it works

1. A patient has an appointment with a doctor. Once the appointment time has started (during the video call or after it), the doctor can write a prescription for it.
2. The doctor adds one or more medicines, plus an optional diagnosis and advice, and issues it. The patient gets an email (no medicine names in it) and sees it right away.
3. If the doctor made a mistake they can **edit** it, which issues a new version that replaces the old one, or **cancel** it with a reason the patient sees ("Stop taking this, I'm changing the dose").
4. The patient sees today's medicines on their overview, current medicines with days left, and every prescription they've had, each printable.

## Rules

| Case                                            | What happens                                                                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Appointment not started yet                     | Can't prescribe; the doctor sees when they can.                                                                                            |
| During the call / after it (booked, completed)  | Can prescribe.                                                                                                                             |
| More than 14 days after the appointment started | Can't write or edit (book a follow-up instead). Cancelling is still allowed, for safety. `PRESCRIBE_WINDOW_DAYS` in the app and SQL match. |
| Appointment cancelled or no-show                | Can't prescribe.                                                                                                                           |
| Marking no-show after prescribing               | Blocked: if there's a prescription the patient attended. The no-show button is hidden and the database refuses it.                         |
| One appointment, several prescriptions          | Only one **active** prescription per appointment (unique index). Edits replace it; cancelled ones stay in history.                         |
| Two tabs editing at once                        | The second save is refused ("changed in another window, refresh") because each edit names the version it replaces.                         |
| Someone else's appointment or prescription      | Not found: RLS only returns rows where you're the patient or doctor, and the write functions check the caller is the appointment's doctor. |
| Patient tries to write                          | No insert/update grants on the tables; only the doctor-checked functions write.                                                            |
| Doctor profile changes later                    | Doctor name, specialization, license, clinic address and patient name are copied onto the prescription when issued.                        |
| Old link to a replaced version                  | The patient sees it marked "Updated" with a link to the latest version.                                                                    |

## Data

Migration `supabase/migrations/20261020120000_prescriptions.sql`:

- `prescriptions`: appointment, doctor, patient, `status` (`active` / `replaced` / `cancelled`), diagnosis (≤200), advice (≤1000), snapshots, `replaces_id`, `issued_at`, cancellation time and reason.
- `prescription_items` (1 to 20 per prescription): medicine (≤100), strength (≤40), form (tablet, capsule, syrup, injection, drops, cream, inhaler, sachet, other), dose (≤40, e.g. "1 tablet"), frequency (`daily`, `weekly`, `as_needed`), times of day (morning / afternoon / night; required unless as needed), food timing (any, before, after, with food), duration in days (1 to 365, empty = ongoing), instructions (≤300).
- RLS: read-only for the prescription's patient and doctor.
- `issue_prescription(appointment, items, diagnosis, advice, replaces)`: checks the caller is the appointment's doctor, the appointment state and window, validates items, replaces the active version atomically.
- `cancel_prescription(prescription, reason)`: doctor only, active only, reason required.
- `set_appointment_outcome` is updated to refuse no-show when an active prescription exists.

## Medicine course

A medicine's course starts on the day the prescription was issued (clinic timezone) and lasts `duration_days` days, or is ongoing. From that:

- **Current medicines**: from active prescriptions whose course hasn't ended, with days left.
- **Today's medicines** (patient overview): daily medicines every day; weekly ones on the same weekday they started; as-needed ones aren't scheduled.
- **Prescription status shown to the patient**: Active, Completed (every course has ended), or Cancelled.

## Screens

**Doctor**

- Appointment details (overview panel and appointments sheet): a Prescription section with the medicines issued and a button to write or view it; a hint when it's too early, too late, or not possible.
- `/doctor/appointments/[appointmentId]/prescription`: appointment context, then the form (new), or the issued prescription with Edit, Cancel and Print, plus any cancelled versions.
- Consultation page: "Prescription" opens that page in a new tab so the call keeps running.
- The form: add/remove medicines (up to 20), checks fields before sending, warns before leaving with unsaved changes.

**Patient**

- `/patient/prescriptions`: current medicines (dose times, food timing, days left) and all prescriptions with status.
- `/patient/prescriptions/[prescriptionId]`: the full prescription, printable.
- Overview: "Today's medicines" and the "Active medicines" stat use real data.
- Appointments: "View prescription" on appointments that have one.

## Emails

Sent to the patient after the response (a failed email never undoes the action), with no medicine names: issued, updated, and cancelled (with the doctor's reason).

## Not included (later)

- Marking doses as taken (needs its own table; nothing is stored in the browser).
- Refill requests and pharmacy ordering from a prescription (waits for medicines ordering).
- A medicine database with autocomplete; names are typed freely.
