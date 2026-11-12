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

## Later

- PRC-11: the doctor's results inbox across visits, unreviewed first.
- A corrected report (LAB-18) should clear the review, so the doctor looks again.
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
