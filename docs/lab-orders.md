# Lab orders (RX-04) and their results (LAB-08)

During or after a visit, the doctor orders lab tests for the person seen. The patient sees the order on the visit and on Lab tests, compares labs that do those tests, and books one with the tests already chosen. LAB-08 builds on this: the booking points back to the order, the report goes to the ordering doctor, and the doctor comments on it (PRC-11 results inbox).

## Choices

**One order per appointment, edited in place.** `lab_orders` has one row per appointment, like `visit_summaries`. The doctor can change the tests, priority and note in the same window as a prescription (from the visit's start until 14 days after) and can cancel it at any time, as with a prescription. Saving a cancelled order issues it again. Prescriptions keep versions because a printed copy goes to a pharmacy; a lab order is booked through MedEase, so the current order is what counts and the audit log keeps who changed what. Once a booking holds some of the tests (LAB-08), the order can add tests or change the priority and note, but can't drop a booked test or be cancelled.

**Tests come from the shared list.** Items point at `lab_test_types`, the list every lab prices its tests from (LAB-01), so an order can be compared and booked at any lab without matching names. This is how electronic ordering works elsewhere: the order is made from a test compendium, and custom tests aren't accepted for electronic orders (Elation, eOrdering). A test that isn't on the list goes in the note, and the doctor asks support to add it. The name is copied onto the item, so a later rename doesn't change an order already made. LOINC codes can be filled in on the list later without touching orders.

**Priority and a note, as in FHIR.** The order follows the shape of a FHIR `ServiceRequest` without adopting the standard: `status` is `active` or `cancelled` (FHIR `active`, `revoked`), `priority` is `routine` or `urgent` (FHIR also has `asap` and `stat`, which mean a hospital lab, not a patient booking a collection), and the note is the patient-facing instruction ("fasting sample", "repeat in 3 months"). It names no diagnosis by design; the visit summary carries that.

**The patient chooses the lab.** Pakistani doctors usually write tests on the prescription and the patient goes to any lab. MedEase keeps that: the order isn't sent to a lab. "Book these tests" lists labs that offer any of the tests, those offering all of them first and then by total price, with each lab's turnaround and home collection. Booking opens the lab's booking page with the ordered tests it offers and the person tested already chosen; tests that lab doesn't offer are named so the patient can book them elsewhere. Package prices aren't used in the comparison yet; the booking page still offers the lab's packages.

**Notices, not emails.** The patient gets an in-app notice when an order is issued, changed or cancelled. Test names are health details, so an email could only say "you have a lab order"; the visit's other emails already bring the patient to the app.

## Rules

- **Tables**: `lab_orders` (appointment, doctor, account holder, person tested, priority, note, status, `cancelled_at`) and `lab_order_items` (test id and name). Items carry `patient_id` and `doctor_id` with a foreign key to the order on all three, so row-level security reads them without a join. The person tested is paired with the account by a foreign key to `care_recipients`, as on appointments.
- **Reads**: the patient and the doctor read their own orders and items. Clinical data, so both need a second factor (restrictive policy and write trigger). Nobody writes directly.
- **Writes**: `save_lab_order(appointment, tests, priority, note)` checks the caller is the appointment's doctor, the visit wasn't cancelled or a no-show and is inside the window, and 1 to 20 known tests without repeats, a note up to 500 characters. It locks the appointment, so two saves take turns. Saving the same order again changes nothing and tells nobody. `cancel_lab_order(appointment)` cancels an active order; a second cancel is quiet.
- **Comparing labs**: `get_lab_order_offers(order)` reads the order through the caller's own row-level security and the public `lab_test_offers` view, filtered by the ordered tests, so it uses `lab_tests_compare_idx` and only sees listed tests at labs in `lab_directory`. At most 50 labs.
- **Notices and audit**: `lab_order_issued`, `lab_order_updated` and `lab_order_cancelled` for the patient; `lab_order.issued`, `lab_order.edited` and `lab_order.cancelled` in the audit log, ids only.
- **Limits**: 1 to 20 tests (a booking holds at most 20 items), note up to 500 characters, and `rateLimits.labOrderUser` (120 saves or cancels an hour per doctor).
- **Indexes**: the patient's orders `(patient_id, created_at desc)`, the doctor's `(doctor_id, created_at desc)`, the person's `(care_recipient_id, created_at desc)`; items by their key `(order_id, test_type_id)`.

## Screens

- Doctor: the appointment sheet has a **Lab tests** part under the prescription, with what was ordered and a link to `/doctor/appointments/[id]/lab-tests`, where the doctor picks tests (searchable list), priority and a note, and saves or cancels. The patient chart shows each visit's order.
- Patient: each visit with an order shows its tests, priority and note with **Book these tests**. `/patient/lab-tests` lists orders from the last 60 days under **Ordered by your doctor**. `/patient/lab-tests/orders/[id]` shows the order and compares labs; **Book** opens `/patient/lab-tests/labs/[labId]?order=[id]`.

## Results (LAB-08)

**The booking points at the order.** `lab_bookings` gains `lab_order_id` and `ordered_test_ids` (the ordered tests it covers, alone or inside a package), as a FHIR `DiagnosticReport.basedOn` points at its `ServiceRequest`. A foreign key on (`lab_order_id`, `patient_id`) keeps the order the patient's own. The lab reads its bookings, so the row never names the doctor: the lab sees only that a doctor ordered the tests, and the doctor is found through the order, which the lab can't read. The booking page fixes the person to the one seen at the visit. `book_lab_test` takes `p_lab_order_id` and links the booking only when the order is the patient's, still active, for the same person, and the booking covers at least one ordered test no other live booking covers. Otherwise it books as usual: the patient may add other tests, or book for someone else, from the same page. Covered tests leave the comparison and the booking page's prefill; an order with nothing left stops showing under "Ordered by your doctor". Cancelling a booking (or a lapsed payment hold) frees its tests.

**The report goes to the ordering doctor, and only that doctor.** Guidance on results management (AHRQ, AMA) is that results route to the ordering clinician, who acknowledges each one. A trigger on `lab_reports` copies the order's doctor onto every report row, first or corrected, and sends that doctor an in-app notice linking to the visit's lab tests page. Row level security lets the doctor read that report row, so `openLabReport` serves them the same one-minute signed link. The whole report goes: a booking can hold tests the doctor didn't order, and the booking page and privacy policy say so.

**The doctor reads only what they need.** The doctor can't read `lab_bookings` (it holds the address, phone and payment). `get_lab_order_bookings(appointment)` returns, for the order of one of the doctor's visits, each booking that wasn't cancelled (one waiting for payment too, since it holds its tests): lab, status, day, covered tests, current report and the review. It takes the visit, so the page loads it alongside the order.

**Reviewed, with a comment the patient sees.** `lab_result_reviews` holds one row per booking: when the doctor reviewed it and an optional comment (up to 1000 characters), like FHIR's `DiagnosticReport.conclusion` from the `resultsInterpreter`. `review_lab_result(booking, comment)` needs the ordering doctor, a second factor and a published report. A new or changed comment sends the patient an in-app notice; removing one doesn't; saving the same again is quiet. The audit log records `lab_result.reviewed` and `lab_result.commented`, ids only. No email: the comment is clinical. PRC-11 builds the doctor's results inbox on the same rows (`lab_reports_ordering_doctor_idx`, `lab_result_reviews_doctor_idx`).

**Screens.** Doctor: under the order on `/doctor/appointments/[id]/lab-tests`, **Bookings and results** lists each booking with its report (`/doctor/lab-results/[reportId]`) and the review form; booked tests are locked in the order form and the cancel button gives way to a note. Patient: the order page shows what's booked and compares labs for the rest; the booking card says "Ordered by your doctor", that the report goes to the doctor, and shows the doctor's comment. Lab: a "Doctor's order" flag on the booking.

**Limits**: `rateLimits.labResultUser` (120 reviews an hour per doctor). **Indexes**: `lab_bookings_lab_order_idx` (partial), `lab_reports_ordering_doctor_idx`, `lab_result_reviews_doctor_idx` and `_patient_idx`.

## Results inbox (PRC-11)

Researched on 2026-11-12, built on 2026-11-13 (`20261113120000_lab_results_inbox.sql`). As built, it differs from the plan below only where noted.

**Scope.** `/doctor/lab-results` lists every report from tests the doctor ordered, across all visits, with reports still to review first. The doctor marks each one reviewed and can comment, using the existing `LabResultReviewForm` and `review_lab_result`. Reports a patient shares need REC-03, which waits on the SEC-06 scanner, so PRC-11 goes to `Partial` with a note. Critical alerts (LAB-11) and check-in alerts (SIG-12/13) join the inbox later.

**Best practice found.** The AMA says "if you order it, you own it": results go only to the ordering care team, and abnormal results stand out. Tracking guidance says a doctor confirms receipt of each result, urgent results that aren't acknowledged in time get escalated, and preliminary, final and corrected reports are told apart, with any change sent to the ordering clinician. A corrected report must therefore appear as unreviewed again. For paging, use keyset (cursor) pagination on `(timestamp, id)`, with `id` as the tiebreaker, an index whose order matches the `ORDER BY` exactly, and a check with EXPLAIN that it does an index seek. Don't use OFFSET.

**Database (`20261113120000_lab_results_inbox.sql`).**
- Track review per report version: add `lab_reports.reviewed_at timestamptz`. Leave `lab_result_reviews` (one per booking) as the source for the comment. A corrected report (LAB-18) is a new row with `reviewed_at` null, so it comes back as one to review with no extra logic. Backfill it: `update lab_reports r set reviewed_at = v.reviewed_at from lab_result_reviews v where v.booking_id = r.booking_id and r.replaced_at is null`.
- As built, `reviewed_at` isn't readable directly: `authenticated` gets a column list on `lab_reports` without it, so labs and patients don't learn when the doctor reviewed. Only the doctor's functions return it. A new `lab_reports` column must be added to that grant.
- Indexes, which replace `lab_reports_ordering_doctor_idx` (drop it):
  - `lab_reports_to_review_idx on (ordering_doctor_id, created_at, id) where ordering_doctor_id is not null and replaced_at is null and reviewed_at is null`. The set stays small however many reports a doctor has reviewed.
  - `lab_reports_reviewed_idx on (ordering_doctor_id, reviewed_at desc, id desc) where ordering_doctor_id is not null and replaced_at is null and reviewed_at is not null`.
- `review_lab_result` changes: after the checks, `update lab_reports set reviewed_at = now() where booking_id = v_booking.id and replaced_at is null and reviewed_at is null`. Today the function returns early when the comment hasn't changed. That return must still mark an unreviewed corrected report, so it should return only when the comment is unchanged and the current report is already reviewed. Also refresh `lab_result_reviews.reviewed_at` when the doctor re-reviews a corrected report, and write `lab_result.reviewed` to the audit log again. No trigger on `lab_reports` blocks updates; there is only `require_second_factor`, and the function already requires the second factor.
- `get_lab_results_inbox(p_reviewed boolean, p_cursor_at timestamptz default null, p_cursor_id uuid default null, p_limit int default 25)`, SECURITY DEFINER, stable, with the same guards as `get_lab_order_bookings` (`not_doctor`, `second_factor_required`). It's needed because doctors can't read `lab_bookings`, by design. Clamp `p_limit` to 1–50.
  - It reads `lab_reports r` (current rows where `ordering_doctor_id = auth.uid()`), joins `lab_bookings b` (for `lab_name`, `status`, `collection`, `visit_date`, `timezone` and `ordered_test_ids`), `lab_orders o` (for `priority` and `appointment_id`) and `appointments a` (for `care_recipient_name` and `care_recipient_relation`, the treated person), then left-joins `lab_result_reviews v` (for `comment`). Test names come from `array(select test_name from lab_order_items i where i.order_id = o.id and i.test_type_id = any(b.ordered_test_ids))`.
  - To review: `reviewed_at is null`, order `created_at asc, id asc`, so the result waiting longest comes first. Urgent items get a badge. They aren't sorted first: that would break the keyset index, and the set is small.
  - Reviewed: order `reviewed_at desc, id desc`, with the keyset `(r.reviewed_at, r.id) < (p_cursor_at, p_cursor_id)`.
  - As built, it first reads the page's report ids from the list's index (an index-only scan, checked with EXPLAIN in `test:sql`), then joins the rest by id in that order. It refuses a cursor with only one half (`invalid_cursor`).
  - As built, it returns no `patient_id` (nothing uses it), and `timezone` is the visit's, so times show in the doctor's zone. It returns `report_id, booking_id, appointment_id, patient_name, care_recipient_name, care_recipient_relation, lab_name, collection, visit_date, timezone, priority, test_names text[], published_at (r.created_at), version, reviewed_at, comment`.
- `count_lab_results_to_review() returns int`, with the same guards, served by `lab_reports_to_review_idx`. It feeds the tab count and an overview stat.
- `npm run test:sql` tests: not a doctor, no second factor, another doctor sees nothing, ordering of both lists, keyset paging, the count, a review marking the report, a corrected report (insert version 2 and set `replaced_at` on version 1) coming back unreviewed and then reviewable with the same comment, and the backfill. Every `raise exception` needs a test.
- Apply with `npx supabase db query --remote=qugkunfzyolslpcftiqe --yes --file <migration>`, then confirm with a read-only query.

**App.**
- `doctorRoutes.labResults = "/doctor/lab-results"` in `src/config/routes.ts`. The `[id]/route.ts` already serves the report, so the page sits beside it. Add `{ title: "Lab results", href: "/doctor/lab-results", icon: FlaskConicalIcon }` to the doctor `nav` in `src/config/dashboards.ts`, after Patients.
- Loaders go in `src/features/lab-orders/data/lab-orders.ts`: `getResultsInbox(reviewed, cursor)` and `countResultsToReview()`. Types go in `lib/lab-orders.ts` (`InboxResult`).
- Page `src/app/(dashboard)/doctor/lab-results/page.tsx`: call `requireRole("doctor")`; `?view=reviewed` switches lists and `?after=<iso>_<uuid>` is the cursor (ids and times only, no patient data). Add `loading.tsx` with `PageSkeleton variant="list"`.
- Components, one per kebab-case file in `src/features/lab-orders/components/`:
  - `results-inbox-tabs.tsx`: link tabs styled like `lab-booking/components/lab-booking-stage-links.tsx`, "To review (n)" and "Reviewed".
  - `results-inbox-list.tsx`, with `EmptyState` from shared.
  - `results-inbox-item.tsx`: the patient (`careRecipientName` and `bookedByLabel` from `src/features/family/`, the doctor's wording), a "Corrected report" badge for version 2 on, tests, lab, published date ("waiting N days" when unreviewed), an urgent badge (`priorityLabels`), `LabReportLink` to `doctorRoutes.labReport(reportId)`, a link to the visit `doctorRoutes.labOrder(appointmentId)`, and `LabResultReviewForm`, keyed by review time and comment like `LabResultEntry`.
  - Paging: a "Next results" / "Older results" link that carries the next cursor. The loader asks for one row more than a page, so the link shows only when there is another page; "Back to the start" leaves a paged list.
- Doctor overview (`src/app/(dashboard)/doctor/page.tsx`): a fifth stat, "Results to review", linking to the inbox (the user chose a fifth card on 2026-11-13). `StatGrid` goes to 3 columns at lg and 5 at xl when there are five; `Stat` takes an optional `href`.
- `LabResultEntry`'s "Reviewed" badge should follow the current report's `reviewed_at`, so `get_lab_order_bookings` should also return `r.reviewed_at`.
- The `lab_result_ready` notice keeps linking to the visit's lab tests page. Optionally change it to the inbox.
- No live badge: per the CLAUDE.md realtime rules that would need a Broadcast event on `user:<id>`, so it's left for later.

**Status.** PRC-11 is `Partial`: reports a patient shares wait on REC-03.

## Later

- A corrected report (LAB-18) should clear the review, so the doctor looks again. PRC-11's `lab_reports.reviewed_at` covers the inbox side of this. LAB-18 must keep the booking `report_ready` while it has a current report: the inbox doesn't check booking status (so its lists stay index-only), and `review_lab_result` refuses any other status.
- A live count on the Lab results nav item, as a Broadcast event on `user:<id>`.
- The order on the printed prescription, for patients who go to a lab outside MedEase.
- Package prices in the comparison.

## Sources

- HL7 FHIR R4, ServiceRequest (status, intent, priority, requisition): https://hl7.org/fhir/R4/ServiceRequest.html
- US Core ServiceRequest profile (LOINC common lab orders value set for codes): https://hl7.org/fhir/us/core/2025Jan/StructureDefinition-us-core-servicerequest.html
- Elation Health, electronic lab orders (orders from the lab's compendium, no custom tests electronically): https://help.elationhealth.com/articles/Electronic-Lab-Order-Form
- Mayo Clinic Laboratories, what the patient considers when choosing a laboratory: https://news.mayocliniclabs.com/?p=104691
- HL7 FHIR R4, DiagnosticReport (basedOn, resultsInterpreter, conclusion): https://hl7.org/fhir/R4/DiagnosticReport.html
- AHRQ, test result communication (closing the loop with the ordering clinician): https://www.ahrq.gov/diagnostic-safety/resources/issue-briefs/dxsafety-test-result-communication2.html
- AMA, reviewing test results (route results to the ordering provider): https://www.ama-assn.org/system/files/regulatory-myths-reviewing-test-results.pdf
- AMA, 9 steps to reduce the EHR inbox ("if you order it, you own it"): https://www.ama-assn.org/practice-management/digital/9-steps-reduce-ehr-inbox-and-stress-system-level
- CAP Today, safer use of lab data in EHRs (corrected reports, notify the ordering clinician): https://www.captodayonline.com/guidance-aims-for-safer-use-of-lab-data-in-ehrs/2/
- CNA, test result management (confirm receipt, escalate unacknowledged urgent results): https://www-new.cna.com/sites/default/files/assets/993bee82-d5d7-4d1f-b57c-14f8e065cb3b/AlertBulletin-Test-Result-Management.pdf
- Readyset, keyset pagination in Postgres: https://readyset.io/blog/optimizing-sql-pagination-in-postgres
