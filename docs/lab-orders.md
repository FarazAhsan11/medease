# Lab orders (RX-04)

During or after a visit, the doctor orders lab tests for the person seen. The patient sees the order on the visit and on Lab tests, compares labs that do those tests, and books one with the tests already chosen. LAB-08 builds on this: the booking points back to the order, the report goes to the ordering doctor, and the doctor comments on it (PRC-11 results inbox).

## Choices

**One order per appointment, edited in place.** `lab_orders` has one row per appointment, like `visit_summaries`. The doctor can change the tests, priority and note in the same window as a prescription (from the visit's start until 14 days after) and can cancel it at any time, as with a prescription. Saving a cancelled order issues it again. Prescriptions keep versions because a printed copy goes to a pharmacy; a lab order is booked through MedEase, so the current order is what counts and the audit log keeps who changed what. When LAB-08 links bookings to an order, an order that has been booked will refuse changes to the tests.

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

## Later

- LAB-08: bookings point at the order, the report goes to the ordering doctor, who comments; an order that has been booked shows as booked and stops showing under "Ordered by your doctor".
- The order on the printed prescription, for patients who go to a lab outside MedEase.
- Package prices in the comparison.

## Sources

- HL7 FHIR R4, ServiceRequest (status, intent, priority, requisition): https://hl7.org/fhir/R4/ServiceRequest.html
- US Core ServiceRequest profile (LOINC common lab orders value set for codes): https://hl7.org/fhir/us/core/2025Jan/StructureDefinition-us-core-servicerequest.html
- Elation Health, electronic lab orders (orders from the lab's compendium, no custom tests electronically): https://help.elationhealth.com/articles/Electronic-Lab-Order-Form
- Mayo Clinic Laboratories, what the patient considers when choosing a laboratory: https://news.mayocliniclabs.com/?p=104691
