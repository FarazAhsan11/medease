# Lab booking (LAB-03, LAB-04, LAB-05, LAB-20)

A patient books one or more tests or packages at one lab, for themselves or a family member, either visiting the lab on a chosen day or having a collector come to a saved address in a time window. The lab sees the booking in its list and moves it through collection and processing (LAB-04, "Status moves" below). Until the sample is taken, the patient can cancel or move the booking in the app (LAB-20, "Patient changes" below). Paying online is PAY-07; until PAY-07, every booking is paid in cash at the lab or to the collector.

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
| processing | report ready (with the report, see "Reports"), new sample needed, cancelled |
| report ready, cancelled | nothing (corrected reports are LAB-18) |

This follows the order lifecycle in HL7's Clinical Order Workflows guide: the filler takes the order, waits for the specimen, works on it, and completes it with a report; an unusable specimen fails the step and the placer is told. "New sample needed" is that failure: the booking returns to the lab's **To collect** list until a new sample is taken.

**The lab names the status it's moving from.** Two people on the lab's account, or two tabs, can act on the same booking. The function locks the row (`for update`) and refuses with `status_changed` when the booking isn't in the status the lab saw, so a double click never moves twice and nobody overwrites a move they didn't see. The page then reloads to show where the booking is. This is the usual guard for state machines in Postgres: serialise transitions with a lock and check the transition inside it.

**Not before the day.** A sample can be marked collected from the booking's visit day on (the lab's local day), which catches a click on the wrong row among future bookings. Later steps have no date rule.

**Reasons from a list, with an optional note.** A new sample and a cancellation each need a reason from a fixed list; "other" needs a note. The lists follow common specimen rejection policies (haemolysed, clotted, too little sample, a label that can't be matched, too long in transit) and the ways a booking falls through (the patient asked, couldn't be reached or wasn't there; the lab can't run the test or send a collector). The patient sees the reason and note in the app, behind sign-in. A patient who phones to cancel is recorded here with "patient asked"; patients can also cancel in the app (LAB-20).

**History in its own table.** `lab_booking_events` keeps every status a booking reaches, with the reason, note and who moved it, written by a trigger on `lab_bookings` (insert and status change), so no code path can change a status without leaving a row. The booking keeps the current reason, note and `status_changed_at`, so lists don't read the history; the patient's list reads it for the tracker's times. Same read rules as the booking: the patient and the lab, with a second factor; nobody writes it directly.

**A notice at each step, no email yet.** Every move puts a notice in the patient's bell (`lab_booking_<status>`), worded in `notifications.ts`. The lab gets none for its own moves. Emails for "report ready" and "cancelled" wait for the NTF-05 outbox; the report is now there to link to.

**Limits.** 600 moves an hour per lab account (`rateLimits.labBookingMoveUser`); notes up to 500 characters.

## Reports (LAB-05)

**The report is the last step.** For a booking it's processing, the lab presses **Upload report**, picks the PDF and publishes it; `publish_lab_report` files the report and moves the booking to report ready in one transaction, which tells the patient. A trigger on `lab_bookings` refuses report ready without a current report (`report_required`), so `move_lab_booking` can no longer mark a booking ready by itself and a patient told "your report is ready" can always open it. Bookings marked ready before this change keep the old wording ("collect it from the lab").

**Confirm whose report it is.** The upload dialog names the person tested and the tests, and says the patient sees it straight away. Under CLIA (42 CFR 493.1291) a lab's report must identify the patient and the lab, and a corrected report keeps the original and says it was corrected. There's no unpublish: a wrong report is fixed by a corrected version (LAB-18), which adds a row with the next `version` and marks the old one `replaced_at`, keeping both files. The table already has these columns and a unique current report per booking, so LAB-18 adds the function, not a new table. Sign-off by a pathologist before release is LAB-17.

**Upload path.** The browser uploads straight to Storage on a signed upload link, so the file never passes through a Server Action (Vercel's 4.5 MB body limit), as Supabase recommends for user uploads (`createSignedUploadUrl`, then `uploadToSignedUrl`). The link is issued only for the lab's own booking while it's processing, at `<lab id>/<booking id>/<uuid>.pdf`, a new path each time and no upsert, so a leftover link can't swap a file. The server then reads the bytes with `verifyUpload` (a real PDF, at most 10 MB), records it with `mark_upload_checked`, and `publish_lab_report` accepts only a recorded file at that booking's path. A file that fails, or isn't published, is deleted. Malware scanning before a patient opens a lab's file is SEC-06, a Phase 0 launch blocker.

**Storage.** A private `lab-reports` bucket (PDF only, 10 MB) with no storage policies. To open a report, the patient's route (`/patient/lab-tests/reports/[id]`) or the lab's (`/lab/reports/[id]`) reads the report row with the user's own session, so row level security (the patient or the lab, with a second factor) is the permission check, and only then signs a 60-second link with the secret key and redirects to it. The browser shows the PDF in its own viewer. The report id is a random UUID and says nothing about the patient.

**Where it shows.** Patient: **View report** on the booking card, a link on the dashboard card, and a **Lab reports** entry in the health records timeline (with a filter), named by tests and lab, and the person tested when it's a family member. Lab: **View report** on finished bookings, and `/lab/reports` lists bookings waiting for a report (oldest visit first, each with **Upload report**) and the 20 latest published.

**Not yet.** The ordering doctor receives the report with LAB-08; structured results with LAB-10; an email when it's ready with NTF-05. Account deletion (AUTH-05) must also remove report files: rows go with the booking, files stay in Storage until then. It must also decide what a patient keeps when a lab closes its account: today the lab's bookings, and so their reports, go with it. A file uploaded but never published (the tab closed in between) stays in Storage too; a cleanup job for files older than a day with no row would remove both kinds.

**Limits.** 300 upload links an hour per lab account (`rateLimits.labReportUploadUser`; the general 20 an hour is sized for a person's own files), and publishing counts with the 600 status moves an hour. Up to 20 versions per booking.

## Patient changes (LAB-20)

**Until the sample is taken.** The patient can cancel or move a booking while it's booked or waiting for a new sample, the same stretch in which the lab can still collect it. Once a sample is taken the lab has started work, and only the lab can cancel (LAB-04). There's no time cut-off before the visit: bookings are paid in cash, so a late change costs the patient nothing, and the lab is told at once. Services that take payment up front set a cut-off and charge for late changes (Quest: free up to 24 hours before a home collection, a fee after); the refund policy already says those rules come with online payment (PAY-07).

**Cancel with a reason.** `cancel_lab_booking` takes a reason from the patient's own list (no longer needed, booked by mistake, going to another lab, none of the times suit, other) and a note for the lab, trimmed as the lab's are, which "other" needs so the lab learns why. The booking records `cancelled_by` (`patient` or `lab`); the table requires it on every cancelled booking and pairs each reason list with its side, so neither can use the other's reasons. A home collection frees its place in the window. Cancelling again returns quietly, so a double click is harmless. The lab gets a `lab_booking_cancelled` notice linking to its Finished list; the patient gets none for their own action, as with appointments.

**Move to a new time.** `reschedule_lab_booking` moves a lab visit to another day (today to 13 days ahead) or a home collection to another window. It locks the booking row, then takes the same advisory lock on the new window as `book_lab_test` and counts its places through `get_lab_collection_slots`, as booking does (one lab's two weeks of windows, so the lock is held briefly; a narrower copy of the window rules could drift from it), so a move and a new booking can't both take the last one. The old window frees by itself, since capacity counts bookings by their current window. The tests, address, fee and way of collection stay as booked, because changing any of them changes the price or the lab's work: that's a cancellation and a new booking. A home collection can move only while the lab still collects, still serves the booking's city, and still draws every booked test at home, as booking checks; its new day is taken in the lab's collection time zone, the one its windows are built in. Moving to the time it already has returns quietly.

**Three moves per booking.** `reschedule_count` stops at 3 (a table check), after which the patient calls the lab. This keeps a booking from holding window after window, and a script from cycling places, alongside 30 changes an hour per account (`rateLimits.labBookingChangeUser`).

**History and notices.** A move adds a `rescheduled` row to `lab_booking_events` (new day and window, who moved it) from a trigger on the booking's time columns, so no path can move a booking without a record; status rows keep `kind = 'status'`, and the patient's tracker reads only those. The lab gets a `lab_booking_rescheduled` notice, and its booking shows "The patient moved this to a new day/window" while still to collect.

**Screens.** The patient's booking card has **Change time** and **Cancel booking** while the booking can change. Change time opens `/patient/lab-tests/bookings/[id]/reschedule`: the booking on one side, days or windows on the other, with the current one marked "Yours" and the moves left. A booking that can't move shows why. Cancelled bookings say "You cancelled" to the patient and "Cancelled by the patient" to the lab.

**Not yet.** Refunds for paid bookings come with PAY-07, along with any late-change rule. Changing the address of a home collection is cancel and rebook.

## Code

- Migrations: `supabase/migrations/20261109120000_lab_bookings.sql`, `supabase/migrations/20261109150000_lab_booking_status.sql`, `supabase/migrations/20261109180000_lab_reports.sql`, `supabase/migrations/20261110120000_lab_booking_changes.sql`
- Features: `src/features/lab-booking/`, `src/features/lab-reports/`

## Sources

- PostgreSQL, [advisory locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS): transaction-level locks are released at commit or rollback.
- Brandur Leach, [Implementing Stripe-like idempotency keys in Postgres](https://brandur.org/idempotency-keys), and Square, [CreateBooking](https://developer.squareup.com/explorer/square/bookings-api/CreateBooking) (`idempotency_key`): one key per user action, enforced by a unique constraint.
- Marham, [book lab tests online](https://www.marham.pk/labs): choose home sample collection or a lab visit.
- Chughtai Lab, [home sampling](https://chughtailab.com/services/chughtai-home-sampling/): booking a home visit at a chosen time.
- HL7, Clinical Order Workflows: [simple lab order flow](https://build.fhir.org/ig/HL7/fhir-cow-ig/ex1-simple-lab-order-flow.html) and [specimen rejected](https://build.fhir.org/ig/HL7/fhir-cow-ig/ex5-lab-order-flow-specimen-rejected.html): accepted, in progress waiting for the specimen, completed with a report; a rejected specimen fails the task and the placer is told.
- Specimen rejection policies, e.g. [Munson Healthcare](https://munsonhealthcare.org/sites/default/files/media/file/Physician%20Services/LabMed%20Report/Specimen%20Rejection%20Policy%20-%20Cliincal%20Laboratory%20Specimesn%20%20October%202021%20%2C%20Volume%2012.pdf) and [SUNY Downstate](https://www.downstate.edu/patient-care/lab-services/_documents/LAB_11.pdf): mislabelled, haemolysed, clotted or too-small samples are rejected and recollected, and the collecting side is told.
- 42 CFR 493.1291, [Standard: Test report](https://www.law.cornell.edu/cfr/text/42/493.1291), and [eCFR part 493 subpart K](https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-493/subpart-K/subject-group-ECFR9482366886d579f): the report identifies the patient and the lab; a corrected report is marked as corrected and the original kept.
- CDC CLIAC, [Addendum S](https://www.cdc.gov/cliac/docs/addenda/cliac0210/Addendum-S.pdf): giving patients their reports directly, and labelling corrected ones.
- Supabase, [createSignedUploadUrl](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl) and [serving downloads](https://supabase.com/docs/guides/storage/serving/downloads): signed upload links for direct uploads; short-lived signed links for private files.
- Quest Health, [How do I reschedule or cancel my in-home sample collection?](https://www.questhealth.com/faqs-how-do-i-reschedule-or-cancel-my-in-home-sample-collection.html): changes free up to 24 hours before, a fee after, for a prepaid collection.
- thoughtbot, [Modeling state transitions in Postgres](https://thoughtbot.com/blog/modeling-state-transitions-in-postgres) and [Inserting state transitions in Postgres](https://thoughtbot.com/blog/inserting-state-transitions-in-postgres): validate transitions under a lock, keep an append-only history.
