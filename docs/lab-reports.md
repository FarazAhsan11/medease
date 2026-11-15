# Lab reports: sign-off and release (LAB-17)

Uploading, storing and opening reports is LAB-05 ([lab-booking.md](./lab-booking.md), "Reports"). This adds the step between upload and patient: a report reaches the patient, and the ordering doctor, only after someone the lab has authorised reviews it and signs it off, and their name and qualification are printed on the report.

## Why

ISO 15189:2022 clause 7.4.1.2 says results are reviewed before release and released by authorised personnel, and the lab keeps a record of who released them. WHO's laboratory quality checklist asks for a written procedure saying who may authorise results. CAP accepts an electronic signature in the lab system, applied by the authorised person under their own login, as the sign-out. A lab working with MedEase today uploads a PDF it already signed on paper or in its own system; this makes the release itself happen in MedEase, recorded against a person.

## Who signs

- A new permission, `reports.sign`, held by the **pathologist** role and the lab admin. A new **technician** role runs tests and uploads reports, but can't sign. See [lab-staff.md](./lab-staff.md) for the full matrix.
- A signer also needs **sign-off details** on their `lab_members` row: `signer_name` and `signer_title` (e.g. "Dr Ayesha Khan" and "MBBS, FCPS (Chemical Pathology), Consultant Pathologist"). Only the lab admin sets them, through `save_lab_signer`, because the lab vouches for the qualification. Without them, `sign_off_lab_report` raises `signer_details_missing`, and the page says to ask the admin.
- The details are limited to printable Latin-1 characters (a check on `lab_members`, repeated in the Zod schema), because the stamp uses a standard PDF font with no embedding.
- Clearing someone's details, removing them, or changing their role away from pathologist stops them signing at once. A role that can't sign drops the details (`set_lab_staff_role`), so promoting someone again means the admin enters them afresh. Reports already signed keep the details as snapshotted.

## The flow

1. **Upload.** As before (signed upload link, `verifyUpload`, `mark_upload_checked`), then `publish_lab_report(booking, path, notify_signers)` files a **pending** report: `released_at` is null and the booking stays `processing`. Everyone who can sign hears about it (`lab_report_to_sign`, through `private.notify_lab(..., 'reports.sign')`), except the uploader. Uploading again while a report is waiting raises `report_awaiting_sign_off`: the signer sends it back first.
2. **Sign off.** `/lab/reports` lists **Waiting for sign-off** (oldest first, 50 shown) for everyone who can view reports; signers get **Review** (opens the PDF), **Sign off** and **Send back**. Signing off:
   - the server reads the report row with the signer's own session (RLS checks the lab), downloads the upload with the secret key, stamps a copy (below), uploads it to a new path in the same folder, and records it with `mark_upload_checked`;
   - `sign_off_lab_report(report, signed_path, signer_name, signer_title)` then, in one transaction, checks the details passed are the ones the stamp printed and still the signer's (`signer_details_changed` if the admin edited them meanwhile, so the file and the record always agree); locks the booking and then the report, the order a status move takes them in, so a sign-off and a cancellation can't deadlock; checks the report is still pending, the booking still processing, and the signed copy recorded at that booking's path (`private.claim_lab_report_upload`, the same check uploads use); sets `storage_path` to the stamped copy and keeps the upload in `original_storage_path`; snapshots `signed_off_by`, `signer_name`, `signer_title` and `released_at`; and moves the booking to `report_ready`, which notifies the patient as before;
   - if the database refuses, the stamped copy is deleted. If the response is lost after a commit, the copy is kept, since it may be the patient's report.
3. **Send back.** `return_lab_report(report, note)` marks the report replaced and returned, with a note of up to 500 characters for the lab (never shown to the patient). The uploader is told (`lab_report_returned`), and the booking is back in **Waiting for a report**. The file stays as the lab's record. Versions keep counting, up to 20 per booking.
4. **Signing your own upload.** A signer uploading a report can tick **Sign it off now**: the upload goes in pending without notifying the other signers, and the same sign-off runs straight after. If that sign-off fails (no details, a locked file), `announce_lab_report` tells the other signers after all, so the report doesn't wait unseen. ISO 15189 allows the person who did the test to release it when they're authorised; the record shows the same person for both steps.

A booking that leaves processing other than by release (a new sample needed, a cancellation) sets aside its pending report through the `retire_pending_lab_report` trigger, so it can't be signed later or block the next upload.

## What each side sees

- **Patient**: nothing until release. The patient's and the ordering doctor's RLS policies on `lab_reports` require `released_at is not null`, so a pending report can't be read, even by id. The booking card shows "Signed off by {name}, {title}" under **View report**. The timeline is dated by release.
- **Ordering doctor**: `route_lab_report` now fires on release (an insert that's already released, or the update that sets `released_at`), so the doctor's inbox (PRC-11) gets the report only once signed. `get_lab_order_bookings` shows only released reports. The doctor's screens don't repeat the signer; the PDF carries it. The inbox dates, orders and pages by release (`lab_reports_to_review_idx` is now on `released_at`), so a report signed off days after upload isn't shown as waiting since the upload, or skipped by the page cursor.
- **Lab**: the booking card says "Waiting for sign-off" while pending, and the signer after release. The booking history (LAB-16) adds "Report uploaded", "Report sent back" and "Report signed off and released" steps. The note shows only to people who can open reports, since it can describe results; collectors see the step without it. Reports from before this keep their "Report ready" step and show no separate upload.
- `require_lab_report` (the trigger that refuses `report_ready` without a report) now needs a **released** report, so `move_lab_booking` still can't mark a booking ready by itself.

## The stamp

`src/features/lab-reports/lib/stamp-report.server.ts`, with `pdf-lib`:

- Two lines: "Reviewed and signed off by {name}, {title}" and "Released electronically in MedEase on 15 Nov 2026, 3:40 pm GMT+5", in the booking's time zone.
- Every page gets a 26pt strip **added below** its content: the media and crop boxes grow, so nothing the lab printed is covered or moved. The strip goes on whichever edge is at the bottom as the page is shown, for rotations of 0, 90, 180 and 270, and the text reads left to right. Text shrinks from 7pt to 5pt to fit a narrow page, then is cut with an ellipsis.
- Helvetica (standard, not embedded), so the file grows by a few kilobytes.
- A file pdf-lib can't open (encrypted or broken) raises `UnstampableReportError`, and the signer is told to send it back for a new copy.
- Checked by rendering a four-page test file (one page per rotation) with pdf.js.

This is a visible statement, not a cryptographic signature. A PAdES digital signature would need a certificate per signer or per lab, which labs here don't have; the database record (who, when, which file) is the authority, and the audit log has `lab_report.uploaded`, `lab_report.signed_off` and `lab_report.returned`.

## Database

- `lab_reports` gains `released_at`, `signed_off_by`, `signer_name`, `signer_title`, `original_storage_path`, `returned_at`, `returned_by` and `return_note`. Checks keep them consistent (`lab_reports_signed_off_check`: a report signed off in MedEase has its release time, signer details and original file; reports from before this have none of them; `lab_reports_returned_check`: a returned report is replaced, has a note, and wasn't released). Reports from before this were backfilled as released at their upload time.
- `signed_off_by`, `returned_by` and `original_storage_path` aren't in the column grant, so only the server functions see them.
- Indexes: `lab_reports_patient_released_idx` and `lab_reports_lab_released_idx` for released lists ordered by release; `lab_reports_to_sign_idx` (partial, pending and current) for the sign-off list. The old patient and lab indexes are dropped.
- Writes only through `publish_lab_report`, `sign_off_lab_report`, `return_lab_report`, `announce_lab_report` and `save_lab_signer`, each starting with `private.lab_caller` and requiring a second factor. Tests in `scripts/test-sql.mjs` (`testLabReportSignOff`).
- Migration: `supabase/migrations/20261115150000_lab_report_sign_off.sql`.

## Limits

Signing off and sending back count with the 600 status moves an hour per account (`rateLimits.labBookingMoveUser`); the admin's details edits with `labStaffUser`.

## Not yet

- Corrected reports (LAB-18) will add a version after release. The unique current report per booking and the pending checks will need revisiting so a correction can wait for sign-off while the released one stays visible.
- A stamped copy left behind when a sign-off's response was lost has no cleanup yet; the general cleanup job for unreferenced files (see lab-booking.md, "Not yet") covers it.
- Non-Latin names on the stamp would need an embedded font.

## Sources

- ISO 15189:2022, clause 7.4.1.2, review and release of results by authorised personnel, as summarised in NATA's ISO 15189 application document: https://nata.com.au/files/2021/05/ISO-15189-Application-Document-Medical-Testing.pdf
- WHO Laboratory Quality Stepwise Implementation tool, authorisation of results: https://extranet.who.int/lqsi/node/143
- NCI Clinical Research Operations, review and release of results (who may authorise): https://ccrod.cancer.gov/confluence/x/y4CCBw
- College of American Pathologists, Remote Sign-Out FAQs (electronic signature applied in the LIS by the authorised pathologist): https://documents.cap.org/documents/Remote-Sign-Out-FAQs.pdf
- pdf-lib, page boxes and `drawText` with rotation: https://pdf-lib.js.org/docs/api/classes/pdfpage
