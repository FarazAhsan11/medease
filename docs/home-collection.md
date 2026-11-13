# Home collection setup (LAB-06)

A lab says where it collects samples at home, what the visit costs, and when its collectors go out, with how many visits each time slot can take. Lab booking (LAB-03) offers patients only what this allows. The admin or front desk then sends a collector on each home visit (built 2026-11-13, below).

## Choices

**Service areas are cities, each with its own fee.** A lab adds the cities it collects in, from the same list as patients' addresses (`src/lib/cities.ts`, checked against `private.cities()`), so a booking matches the address's city exactly. Each city has a collection fee in whole rupees (0 for free) and an optional note shown to patients ("All of Lahore except Raiwind"). Labs in Pakistan advertise home sampling by city (Chughtai Lab lists the cities it covers and asks patients to confirm the area), and there's no postal code to route by. Areas within a city aren't matched: the patient's area is free text, and matching "DHA" against "DHA Phase 5" would wrongly refuse or accept. Finer coverage comes with map pins (geocoded address, distance from a branch, LAB-14), which can add a radius without changing this.

**Free collection above an amount.** A lab can waive the fee when the order reaches an amount it sets (`free_above`), which is how most labs here price home sampling. One amount per lab, not per city.

**Slots are windows with a capacity.** Collectors arrive within a window, not at a minute, because traffic decides the exact time; window-based scheduling of about an hour is the norm for home blood draws. The lab sets weekly collection hours (the same editor as doctors' weekly hours), a slot length of 30, 60, 90 or 120 minutes, and how many visits one slot can take (roughly how many collectors are out, 1 to 20). Early-morning hours matter most: fasting tests are collected then.

**Minimum notice.** A slot can be booked only if it starts at least 1, 2, 3, 6, 12 or 24 hours ahead (the lab's choice), so a collector can be assigned and travel. Slots are offered for the next 7 days by default; `get_lab_collection_slots` takes up to 14 if booking needs a longer view.

**Home collection on or off.** A lab switches it on only with at least one collection range and one service area; the database refuses otherwise, and refuses to remove the last area while it's on. Because the database keeps that rule, "collects at home" is one column, `accepting`, and the patient views read it with a primary-key lookup.

**What patients see follows from it.** A test's "Home collection" badge (`lab_tests.home_collection`) now shows only while its lab has home collection on, in `lab_test_offers`, `lab_test_catalog` and `lab_package_offers`. A lab can tick the box on a test before setting up collection; it shows from the moment collection is on.

**Capacity at booking (LAB-03).** `get_lab_collection_slots` returns each slot's spots left, capacity minus bookings that weren't cancelled (LAB-03), to signed-in users only, and `book_lab_test` takes a transaction-level advisory lock on the lab and slot (`pg_advisory_xact_lock`) before counting and inserting, so two patients can't take the last spot together. A count followed by an insert without a lock lets both through, and `FOR UPDATE` can't lock rows that don't exist yet.

**Bookings already made stay.** Changing hours, capacity or areas never cancels a booking; the lab handles those in its bookings list (LAB-04).

**Timezone.** Every city on the list is in Pakistan, so collection hours are in `Asia/Karachi`, kept in a column for when that changes.

## Rules

- **Tables**: `lab_collection_settings` (one row per lab), `lab_collection_hours` (weekly ranges, at most 3 a day, no overlaps, each fits one slot), `lab_service_areas` (one row per lab and city). The lab reads its own rows through RLS (`lab_id = auth.uid()`); nobody writes directly.
- **Writes**: `save_lab_collection_schedule` (hours and settings together, replacing the week in one transaction), `save_lab_service_area` and `delete_lab_service_area`. Each checks the caller is a lab with a profile that has passed two-factor, and locks the lab's `lab_profiles` row first, so the on-with-an-area rule can't be broken by two tabs.
- **Reads for patients**: `lab_collection_areas` (city, fee, note, free-above amount) and `get_lab_collection_slots(lab, days)`, both only for labs in `lab_directory` with home collection on.
- **Rate limit**: `rateLimits.catalogUser`, shared with catalog edits.

## Screens

- Lab: `/lab/home-collection`. Collection hours on the left; on the right, the switch, slot length, visits per slot, minimum notice and the free-above amount, saved together. Service areas below, added and edited in a sheet.
- Patients: on the compare page, a lab offering home collection shows the cities it collects in and the fee. Choosing a slot and address comes with LAB-03.

## Assigning a collector

Built 2026-11-13, on staff accounts (LAB-07).

**Who assigns, who goes.** The lab admin and front desk assign (`bookings.assign`), as a dispatcher does in home-phlebotomy services: the visit is given to a person, who gets it on their phone. Anyone whose role can take samples (`bookings.collect`: collectors, front desk, the admin) can be sent, so a small lab whose admin goes out works too. The picker lists collectors first, and next to each person how many visits they already have that day, so work is spread by hand. Route planning and automatic assignment are later work.

**Collectors see less.** A home visit carries the patient's address and phone. HHS's minimum-necessary rule asks that staff reach only the health information their role needs, so a collector now sees lab visits (they may draw blood at the branch) and only the home visits given to them, instead of every booking. Everyone else in the lab sees every booking (`bookings.view_all`). This is row level security on `lab_bookings`; items and history follow because their policies read through it. `move_lab_booking` refuses a collector's move on a home visit that isn't theirs, so knowing an id isn't enough.

**Kept out of the booking row.** Patients read their own `lab_bookings` rows, so the assignment lives in `lab_booking_assignments` (one row per booking, the collector, who assigned and when), which only the lab reads. Foreign keys hold the booking and the collector to the same lab (`(booking_id, lab_id, patient_id)` to the booking, `(collector_id, lab_id)` to the member). Deleting a person's account deletes their assignments with it; removing them from the lab doesn't. In the lab, those who see every booking read every row, a collector their own. The lab list reads it as an embedded one-to-one, in the same query.

**Kept true.** Assigning locks the booking row, so it queues behind a reschedule or a status move. Only a home visit still to collect (`booked` or `recollection_needed`) can be assigned. When the patient moves the visit to another window, the assignment is dropped (the collector may not be free then) and the visit shows "Nobody assigned" again. When someone is removed, or moved to a role that can't take samples, their open visits go back the same way; visits already made keep their name for the record, as does a cancelled one.

**Notices.** A new, cancelled or moved lab visit still goes to everyone who takes samples, since any of them may see the patient at the branch. A home visit's go to the people who arrange visits (admin, front desk), since collectors wouldn't see it; so does a home visit that needs a new sample, which someone has to arrange again. A collector is told when a visit is given to them, when it's taken off their list (reassigned or moved), when one of theirs is cancelled (the link opens Finished) and when one needs a new sample. Nobody is told about their own change, and nobody twice for one event (`private.lab_booking_audience`, `private.notify_lab_collector`).

**Load per person.** `get_lab_collectors(p_days)` returns each person with their visits still to make on the days the page shows, counted in the database along the (lab, day) index, so a list cut off at 100 bookings still shows the real load. The picker says "2 other visits that day", leaving out the visit being assigned.

## Code

- Migration: `supabase/migrations/20261108180000_home_collection.sql`; assigning collectors in `20261113180000_lab_collectors.sql` (`assign_lab_collector`, `get_lab_collectors`, `lab_booking_assignments`)
- Assigning: `src/features/lab-booking/components/lab-booking-collector.tsx`, `assign-collector-select.tsx`, `actions/assign-collector.ts`, `data/lab-collectors.ts`
- Feature: `src/features/home-collection/`
- Weekly hours editor shared with doctors: `src/components/shared/weekly-hours-card.tsx`, `src/components/shared/weekday-hours-row.tsx`, rules in `src/lib/weekly-hours.ts`.

## Sources

- Chughtai Lab, [home sampling](https://chughtailab.com/services/chughtai-home-sampling/) and [FAQ](https://chughtailab.com/faq-group/test-samples): coverage by city, collection at the patient's suggested time, area confirmed with support.
- Speedy Sticks help centre, [choosing a time window](https://speedysticks.com/answers/can-i-request-a-specific-time-window-for-my-appointment) and [early-morning fasting draws](https://speedysticks.com/answers/early-morning-appointments-fasting-labs): about one-hour arrival windows, fasting tests early.
- PostgreSQL, [explicit locking and advisory locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS): transaction-level advisory locks are released at commit or rollback.
- HHS, [minimum necessary requirement](https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/minimum-necessary-requirement/index.html): limit staff access to the health information their role needs.
- Creliohealth, [home collection](https://creliohealth.com/solutions/home-collection/), and the qliqSOFT [dispatch case study](https://www.casestudies.com/company/qliqsoft/case-study/american-health-associates-streamlines-staff-dispatch-and-requisitions-with-qliq): a dispatcher assigns each visit to a phlebotomist, who gets it on their phone.
- PostgreSQL mailing list, [counting to enforce a limit under concurrency](https://www.postgresql.org/message-id/4A12FCB6.5020008%40archonet.com): a count then insert races, and `FOR UPDATE` doesn't combine with aggregates.
