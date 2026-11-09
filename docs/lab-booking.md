# Lab booking (LAB-03, LAB-04)

A patient books one or more tests or packages at one lab, for themselves or a family member, either visiting the lab on a chosen day or having a collector come to a saved address in a time window. The lab sees the booking in its list and moves it through collection and processing (LAB-04, "Status moves" below). The patient cancelling or rescheduling in the app is LAB-20, paying online PAY-07; until PAY-07, every booking is paid in cash at the lab or to the collector.

## Choices

**One booking, one lab, several items.** A booking holds tests and packages from a single lab (`lab_booking_items`), because one visit or one collector draws every sample together and the lab bills it as one order. The patient starts from a lab on the compare page or a package card and adds that lab's other tests on the booking page. A test can't be ordered twice in one booking, whether alone or inside a package, so nobody pays for the same draw twice (`duplicate_test`).

**Everything the lab and patient see is a snapshot.** Each item keeps its name, price and, for a package, the names of its tests; the booking keeps the lab's name, address and phone, the patient's name and phone, the person tested (name, relation, date of birth and sex, which labs need for reference ranges), the collection address and the fee. Later catalog edits, a renamed family member or an edited address never change an order already placed, as with appointments and prescriptions.

**Lab visit is by day, home collection by window.** Labs have no opening hours in MedEase yet (LAB-14), so a lab visit books a day in the next 14, and the patient comes during opening hours; this is how Pakistani booking sites present a walk-in visit. Home collection uses the lab's windows from `get_lab_collection_slots` (LAB-06), which now subtracts bookings that weren't cancelled. Full windows stay in the list, marked full, as booked doctor slots do.

**Home collection rules come from the database.** It's offered only when the lab has it on (`accepting`), every item allows it, and the chosen address is in one of the lab's cities. The fee is that city's fee, waived when the order reaches the lab's free-above amount. The page shows the same rules so nobody is refused at the last step, but `book_lab_test` checks each one again.

**Capacity holds under concurrency.** `book_lab_test` takes a transaction-level advisory lock on the lab and window (`pg_advisory_xact_lock`) before counting the window's bookings and inserting, so two patients can't both take the last visit. A count followed by an insert without a lock lets both through, and `FOR UPDATE` can't lock rows that don't exist yet. The lock key is built from the lab id and the window's epoch seconds, not the timestamp's text, which follows the session's time zone. Lab visits have no capacity. `get_lab_collection_slots` is for signed-in users only, since spots left would show any visitor a lab's volume.

**A retried submit can't book twice.** The form makes a request id when it opens, and the booking stores it under a unique key per account. Sending the same request again, from a double click, a slow network or a retry, returns the booking already made instead of a second one. This is the idempotency key pattern used by booking and payment APIs (Square's `CreateBooking`, Stripe), with the unique constraint deciding rather than a check followed by an insert.

**Payment is cash until PAY-07.** `payment_method` is `cash` and `payment_status` `unpaid`; online payment adds values without changing the table's shape.

**Limits.** 1 to 20 items, at most 20 open bookings per account with a visit still to come (bookings left behind on past days don't count, since status moves come with LAB-04), and 20 bookings an hour per account (`rateLimits.labBookingUser`), which stops a script without bothering a family booking for everyone.

**Notices, not emails.** A new booking puts a notice in the lab's bell and the patient's. No email goes out yet: test names are health details, so a confirmation email would say no more than "you have a booking", and reminders for home collection come with the lab's status updates (LAB-04, LAB-13).

## Rules

- **Tables**: `lab_bookings` (one per order) and `lab_booking_items`. Items carry `lab_id` and `patient_id` with a foreign key to the booking on all three, so row-level security reads them directly without a join. The person tested is paired with the account by a foreign key to `care_recipients`, as on appointments.
- **Reads**: the patient reads their bookings (`patient_id = auth.uid()`), the lab its own (`lab_id = auth.uid()`); clinical data, so both need a second factor (restrictive policy and write trigger). Nobody writes directly.
- **Write**: `book_lab_test` checks the caller is a patient, the person is theirs, the lab is listed, every item is listed at that lab, and the collection rules above, then inserts the booking and items in one transaction.
- **Status**: `booked`, `sample_collected`, `processing`, `report_ready`, `cancelled`, `recollection_needed`, moved by the lab through `move_lab_booking` (see "Status moves").
- **Related refusals**: `delete_lab_package` refuses a package that has been booked (`package_has_bookings`); the lab unlists it instead. `delete_family_member` refuses someone with lab bookings.
- **Indexes**: the patient's list `(patient_id, created_at desc)`, the lab's open and finished bookings, each `(lab_id, visit_date, slot_starts_at nulls first, created_at)` partial on its statuses and read forwards or backwards in exactly that order, window capacity `(lab_id, slot_starts_at)` for home bookings that weren't cancelled.

## Screens

- Patient: on the compare page each lab has **Book**; packages too. Guests get **Log in to book**. `/patient/lab-tests/labs/[labId]` is the booking page: tests and packages (with a filter), lab visit or home collection, address, day and window, who it's for, and the total. After booking, `/patient/lab-tests` lists the patient's bookings with their progress; the dashboard card shows the latest.
- Lab: `/lab/bookings` has three working lists, **To collect** (booked, new sample needed), **In the lab** (sample collected, processing) and **Finished** (report ready, cancelled), each by visit day, with counts on the first two. To collect shows today and later first, then bookings **still open from earlier days** in their own section, latest first, so leftovers can't push today's work off the page; In the lab is oldest first; Finished latest first. Each booking shows the person tested, items, collection details, total, any reason and note, and its next steps.
- Patient: each booking's tracker shows when each step happened; a cancelled booking or one needing a new sample shows the reason and the lab's note.

## Status moves (LAB-04)

**One path, checked in the database.** `move_lab_booking` accepts only these moves, so a lab can't skip a step or reopen a finished booking:

| From | To |
| --- | --- |
| booked | sample collected, cancelled |
| new sample needed | sample collected, cancelled |
| sample collected | processing, new sample needed, cancelled |
| processing | report ready, new sample needed, cancelled |
| report ready, cancelled | nothing (corrected reports are LAB-11) |

This follows the order lifecycle in HL7's Clinical Order Workflows guide: the filler takes the order, waits for the specimen, works on it, and completes it with a report; an unusable specimen fails the step and the placer is told. "New sample needed" is that failure: the booking returns to the lab's **To collect** list until a new sample is taken.

**The lab names the status it's moving from.** Two people on the lab's account, or two tabs, can act on the same booking. The function locks the row (`for update`) and refuses with `status_changed` when the booking isn't in the status the lab saw, so a double click never moves twice and nobody overwrites a move they didn't see. The page then reloads to show where the booking is. This is the usual guard for state machines in Postgres: serialise transitions with a lock and check the transition inside it.

**Not before the day.** A sample can be marked collected from the booking's visit day on (the lab's local day), which catches a click on the wrong row among future bookings. Later steps have no date rule.

**Reasons from a list, with an optional note.** A new sample and a cancellation each need a reason from a fixed list; "other" needs a note. The lists follow common specimen rejection policies (haemolysed, clotted, too little sample, a label that can't be matched, too long in transit) and the ways a booking falls through (the patient asked, couldn't be reached or wasn't there; the lab can't run the test or send a collector). The patient sees the reason and note in the app, behind sign-in. Patients cancel by phoning the lab until LAB-20, and the lab records it here with "patient asked", which frees the window's place.

**History in its own table.** `lab_booking_events` keeps every status a booking reaches, with the reason, note and who moved it, written by a trigger on `lab_bookings` (insert and status change), so no code path can change a status without leaving a row. The booking keeps the current reason, note and `status_changed_at`, so lists don't read the history; the patient's list reads it for the tracker's times. Same read rules as the booking: the patient and the lab, with a second factor; nobody writes it directly.

**A notice at each step, no email yet.** Every move puts a notice in the patient's bell (`lab_booking_<status>`), worded in `notifications.ts`. The lab gets none for its own moves. Emails for "report ready" and "cancelled" wait for LAB-05 reports and the NTF-05 outbox, so an email links to something the patient can open.

**Report ready before reports upload.** Until LAB-05, "report ready" means the lab has the result and gives it to the patient its usual way; the lab confirms before marking it, and the patient's card says to collect it from the lab. LAB-05 attaches the PDF to this step.

**Limits.** 600 moves an hour per lab account (`rateLimits.labBookingMoveUser`); notes up to 500 characters.

## Code

- Migrations: `supabase/migrations/20261109120000_lab_bookings.sql`, `supabase/migrations/20261109150000_lab_booking_status.sql`
- Feature: `src/features/lab-booking/`

## Sources

- PostgreSQL, [advisory locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS): transaction-level locks are released at commit or rollback.
- Brandur Leach, [Implementing Stripe-like idempotency keys in Postgres](https://brandur.org/idempotency-keys), and Square, [CreateBooking](https://developer.squareup.com/explorer/square/bookings-api/CreateBooking) (`idempotency_key`): one key per user action, enforced by a unique constraint.
- Marham, [book lab tests online](https://www.marham.pk/labs): choose home sample collection or a lab visit.
- Chughtai Lab, [home sampling](https://chughtailab.com/services/chughtai-home-sampling/): booking a home visit at a chosen time.
- HL7, Clinical Order Workflows: [simple lab order flow](https://build.fhir.org/ig/HL7/fhir-cow-ig/ex1-simple-lab-order-flow.html) and [specimen rejected](https://build.fhir.org/ig/HL7/fhir-cow-ig/ex5-lab-order-flow-specimen-rejected.html): accepted, in progress waiting for the specimen, completed with a report; a rejected specimen fails the task and the placer is told.
- Specimen rejection policies, e.g. [Munson Healthcare](https://munsonhealthcare.org/sites/default/files/media/file/Physician%20Services/LabMed%20Report/Specimen%20Rejection%20Policy%20-%20Cliincal%20Laboratory%20Specimesn%20%20October%202021%20%2C%20Volume%2012.pdf) and [SUNY Downstate](https://www.downstate.edu/patient-care/lab-services/_documents/LAB_11.pdf): mislabelled, haemolysed, clotted or too-small samples are rejected and recollected, and the collecting side is told.
- thoughtbot, [Modeling state transitions in Postgres](https://thoughtbot.com/blog/modeling-state-transitions-in-postgres) and [Inserting state transitions in Postgres](https://thoughtbot.com/blog/inserting-state-transitions-in-postgres): validate transitions under a lock, keep an append-only history.
