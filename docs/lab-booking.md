# Lab booking (LAB-03)

A patient books one or more tests or packages at one lab, for themselves or a family member, either visiting the lab on a chosen day or having a collector come to a saved address in a time window. The lab sees the booking in its list. Moving it through collection and processing is LAB-04, cancelling and rescheduling LAB-20, paying online PAY-07; until PAY-07, every booking is paid in cash at the lab or to the collector.

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
- **Status**: `booked`, `sample_collected`, `processing`, `report_ready`, `cancelled`, `recollection_needed`. Only `booked` is written now; LAB-04 adds the moves.
- **Related refusals**: `delete_lab_package` refuses a package that has been booked (`package_has_bookings`); the lab unlists it instead. `delete_family_member` refuses someone with lab bookings.
- **Indexes**: the patient's list `(patient_id, created_at desc)`, the lab's list `(lab_id, visit_date, slot_starts_at)`, window capacity `(lab_id, slot_starts_at)` for home bookings that weren't cancelled.

## Screens

- Patient: on the compare page each lab has **Book**; packages too. Guests get **Log in to book**. `/patient/lab-tests/labs/[labId]` is the booking page: tests and packages (with a filter), lab visit or home collection, address, day and window, who it's for, and the total. After booking, `/patient/lab-tests` lists the patient's bookings with their progress; the dashboard card shows the latest.
- Lab: `/lab/bookings` lists bookings by day, with the person tested, items, collection details and total. Status actions come with LAB-04.

## Code

- Migration: `supabase/migrations/20261109120000_lab_bookings.sql`
- Feature: `src/features/lab-booking/`

## Sources

- PostgreSQL, [advisory locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS): transaction-level locks are released at commit or rollback.
- Brandur Leach, [Implementing Stripe-like idempotency keys in Postgres](https://brandur.org/idempotency-keys), and Square, [CreateBooking](https://developer.squareup.com/explorer/square/bookings-api/CreateBooking) (`idempotency_key`): one key per user action, enforced by a unique constraint.
- Marham, [book lab tests online](https://www.marham.pk/labs): choose home sample collection or a lab visit.
- Chughtai Lab, [home sampling](https://chughtailab.com/services/chughtai-home-sampling/): booking a home visit at a chosen time.
