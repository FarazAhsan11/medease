# Sample tracking (LAB-16)

Each sample gets a code and a barcode label, and the lab sees every step of a booking with who took it. Sign-off (LAB-17) and the collector's day view (LAB-21) build on this.

## Choices

**An accession per collection attempt, a code per container.** When a booking first needs codes, it gets an accession number, `YYMMDD-NNNN`: the lab's local day and its running number that day. Each container gets a code under it with a letter for its sample type: `261115-0007-B` (blood), `-U` (urine), `-S` (stool). A booking with a blood test and a urine test has two codes under one accession. This follows how hospital systems number specimens (a Cerner procedure uses Julian date, specimen number and a container letter), and DICOM's split between the specimen and its container. The codes are short enough to write by hand when a printer is down, and unique within the lab.

**Made on the first print, or at collection.** The front desk can print labels ahead, for example the day's home visits for the collector to take along (decided with the user, 2026-11-15). If nobody printed, marking the sample collected makes the codes. A request for a new sample, or a cancellation, marks the open containers rejected, with who, when and the reason, so a tube printed ahead can't pass for a live one; after a new sample request the next print or collection starts a new accession. Rejected codes stay on record, so an old tube can still be traced. A booking already collected before codes existed gets them on its first print.

**Containers as booked.** Which tubes a booking needs comes from its tests as they were booked: each booking item keeps `sample_types`, filled in by a trigger when it's inserted (a package through the tests it held then). A lab editing a package later doesn't change the tubes for earlier bookings. Items booked before this were filled from their package's tests at the time of the migration.

**A trigger keeps them in step with the status.** Like the booking history, `track_lab_samples` runs on every status change: collected fills in who and when (making codes first if needed), and a new sample request or a cancellation retires the open ones. No code path can move a booking without it.

**One rule for who may act on a booking.** `private.lab_booking_for` finds the booking for the caller's lab and hides other collectors' home visits; printing, the history and `move_lab_booking` all use it, matching the bookings policy.

**Who may print.** Anyone with `bookings.collect` (lab admin, front desk, sample collector), for bookings they can see: collectors only print lab visits and their own home visits. Labels print from booked until processing; not for a finished or cancelled booking. Printing is a POST action that then opens the labels page, which only reads, so a prefetched link can never make a code.

**The label.** One 2 × 1 inch (50.8 × 25.4 mm) label per container, the size CLSI AUTO12 sets for tube labels, printed one per page for thermal label printers. The person's name is top left (AUTO12 calls it the most important element), then a second identifier (date of birth) and gender, the sample type, the visit day, a Code 128 barcode and its code in text. The barcode carries only the code, never patient details. Collection time is printed when known; on labels printed ahead there are blanks for the time and the collector's initials, filled in at the bedside, as outpatient labelling policies ask. The page tells staff to label in front of the patient, straight after collection (CLSI GP41).

**The barcode** is drawn on the server as SVG by `bwip-js` (the generic, SVG-only build), with the 10-module quiet zone Code 128 needs either side. The page sets `@page { size: 50.8mm 25.4mm; margin: 0 }` only while it's open; the print dialog must have scaling off.

**Who did each step.** Every status move was already logged in `lab_booking_events` with `changed_by`, which since LAB-07 is the staff member. `get_lab_booking_history` gives the lab each step with the person's name and role (names live on accounts that staff can't read), "the patient" for the patient's own steps, and MedEase for system steps. Someone the lab removed keeps their name on what they did. The same visibility rule applies as for bookings.

## Screens

- **Bookings list**: each booking shows its open codes, **Print labels** (for roles that collect) and **Details and history**.
- **`/lab/bookings/[id]`**: the booking, every container it has had (label printed, collected or rejected with the reason) and its history.
- **`/lab/bookings/[id]/labels`**: the labels at size, with a Print button.

## Not in this step

- Finding a booking by scanning its code (the unique `(lab_id, code)` index is ready for it).
- Codes on the report (LAB-17 sign-off) and per-test results (LAB-10).

## Code

- Migration: `supabase/migrations/20261115120000_lab_samples.sql` (`lab_samples`, `lab_accession_counters`, `lab_booking_items.sample_types`, `issue_lab_samples`, `track_lab_samples`, `lab_booking_for`, `prepare_lab_sample_labels`, `get_lab_booking_history`, and `move_lab_booking` on the shared lookup).
- Feature: `src/features/lab-samples/`.
- Rate limit: `rateLimits.labSampleLabelUser`, 600 prints an hour per person.

## Sources

- CLSI AUTO12, Specimen Labels: Content and Location, Fonts, and Label Orientation: https://clsi.org/standards/products/automation-and-informatics/documents/auto12
- CLSI, Prevention of specimen labeling errors in the lab: https://clsi.org/about/blog/prevention-of-specimen-labeling-errors-in-the-lab/
- ADLM Clinical Laboratory News, Advancing standards for specimen labeling and tracking (2020): https://myadlm.org/cln/articles/2020/june/advancing-standards-for-specimen-labeling-and-tracking
- Specimen labelling standard with accession and container letter (Cerner-based procedure): https://ltac.medtraining.org/ltac/docs/custom/236/10998_Specimen%20Label%20Information%20and%20Placement.pdf
- Outpatient labelling: two identifiers, collection time, collector initials: https://deaconess.com/Services/Laboratory/Documents-Lab/Lab-Resources-Documents/General-Information/General-Collection-and-Labeling
- DICOM PS3.17, specimen and container identifiers: https://dicom.nema.org/medical/dicom/2024c/output/chtml/part17/sect_NN.3.5.html
- MDN, `@page` `size`: https://developer.mozilla.org/en-US/docs/Web/CSS/@page/size
- bwip-js: https://github.com/metafloor/bwip-js

# Turnaround (LAB-19)

Each test in a lab's catalog already carries the hours the lab promises (LAB-02). LAB-19 keeps that promise on each booking and measures it.

## Choices

- **The promise is kept as booked.** `lab_booking_items.turnaround_hours` is filled by the same insert trigger as the item's sample types: a test's hours, or a package's slowest test. Later catalog edits don't change a booking already placed. The booking's promise is its slowest item.
- **The clock runs from collection to release.** ISO 15189 leaves the start and stop points to each lab, but asks for a set time per examination, agreed with users, and regular checks that it is met. We count from the sample being collected (what the patient lives through, transport included for home visits) to the report's first release after sign-off (when the patient can open it). The labs' own catalog wording ("results in 24 hours") matches that.
- **The database keeps the clock.** A `before update of status` trigger (`track_lab_turnaround`) sets `turnaround_started_at` and `report_due_at` when a sample is collected, clears them when a new sample is needed or the booking is cancelled (a new sample restarts the clock), and sets `reported_at` on the first release. Corrections (LAB-18) don't move the booking, so `reported_at` stays the first release. Every path that moves a booking (`move_lab_booking`, `collect_lab_booking`, sign-off) goes through it, and nobody can write the columns directly. Bookings from before LAB-19 took their clock from their history; finished ones got no due time, since today's catalog hours may not be what was promised, so they count as released but not as on time or late.
- **What each side sees.** Before collection the patient sees "usually ready within 24 hours of the sample being taken"; once collected, "expected by" the due time, and past it a note to call the lab. The lab sees the due time on each booking in the lab and on the reports page, a red "overdue by" badge once past it, and the reports page lists the soonest due first.
- **The lab's record.** `get_lab_turnaround(days)` (anyone with `bookings.view_all`, second factor needed) returns samples past due now and, over the last 30 days, reports released, how many had a promise and came on time, and the median hours from collection to report. It shows above the "In the lab" list. Both counts run on partial indexes: `(lab_id, report_due_at)` for bookings in the lab and `(lab_id, reported_at)` for released ones.
- **No alerts yet.** Overdue bookings are highlighted, not emailed: notifying the lab would need a scheduled job, and the list already puts them in front of the people doing the work.

## Code

- Migration: `supabase/migrations/20261124120000_lab_turnaround.sql`.
- `src/features/lab-booking/lib/report-timing.ts`, `components/report-timing-note.tsx`, `components/turnaround-summary.tsx`, `data/lab-turnaround.ts`.

## Sources

- ISO 15189:2022, Medical laboratories, turnaround times per examination and their review (summary in INAB's notification on TATs): https://www.inab.ie/inab-documents/notifications/notification-on-turnaround-times-tats.pdf
- Hawkins, Laboratory turnaround time (Clin Biochem Rev, 2007): https://pmc.ncbi.nlm.nih.gov/articles/PMC2282400
- Turnaround time definitions vary; report the start and stop points used (BMC Med Inform Decis Mak, 2011): https://bmcmedinformdecismak.biomedcentral.com/articles/10.1186/1472-6947-11-34
