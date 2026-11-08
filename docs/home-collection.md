# Home collection setup (LAB-06)

A lab says where it collects samples at home, what the visit costs, and when its collectors go out, with how many visits each time slot can take. Lab booking (LAB-03) offers patients only what this allows. Assigning a collector to a booking comes with bookings (LAB-03) and staff accounts (LAB-07); until then LAB-06 is Partial.

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

## Code

- Migration: `supabase/migrations/20261108180000_home_collection.sql`
- Feature: `src/features/home-collection/`
- Weekly hours editor shared with doctors: `src/components/shared/weekly-hours-card.tsx`, `src/components/shared/weekday-hours-row.tsx`, rules in `src/lib/weekly-hours.ts`.

## Sources

- Chughtai Lab, [home sampling](https://chughtailab.com/services/chughtai-home-sampling/) and [FAQ](https://chughtailab.com/faq-group/test-samples): coverage by city, collection at the patient's suggested time, area confirmed with support.
- Speedy Sticks help centre, [choosing a time window](https://speedysticks.com/answers/can-i-request-a-specific-time-window-for-my-appointment) and [early-morning fasting draws](https://speedysticks.com/answers/early-morning-appointments-fasting-labs): about one-hour arrival windows, fasting tests early.
- PostgreSQL, [explicit locking and advisory locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS): transaction-level advisory locks are released at commit or rollback.
- PostgreSQL mailing list, [counting to enforce a limit under concurrency](https://www.postgresql.org/message-id/4A12FCB6.5020008%40archonet.com): a count then insert races, and `FOR UPDATE` doesn't combine with aggregates.
