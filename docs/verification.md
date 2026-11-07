# Doctor verification and the admin area

Phase 0 of [srs.md](./srs.md): ADM-01 to ADM-03, ADM-05, AUTH-04, DIR-02, PRC-08, FIX-07, SEC-04. No doctor reaches patients until an admin has checked them against the PMDC register.

## How it works

1. A doctor signs up. Their account starts as `pending`: they can sign in and use their dashboard, but they aren't listed or bookable. Their overview shows that they aren't live, and `/doctor/verification` shows their status and setup checklist.
2. After confirming their email, they upload a profile photo, PMDC license and degree on that page. Sign-up takes no files.
3. An admin opens the doctor from the queue at `/admin`, checks the documents and the [PMDC register](https://pmdc.pk), and decides.
4. The doctor gets an email that only says there's an update. The note sits behind sign-in, on `/doctor/verification`.

| Decision                 | Result                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| Approve                  | Listed with a "PMDC verified" badge and the registration number. Bookable once they've set hours. |
| Ask for more information | Stays hidden. New documents put them back in the queue as `pending`.                              |
| Reject                   | Stays hidden. Final for now; the doctor is told to contact support.                               |

## Rules

| Case                                                                                | What happens                                                                                                            |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Approving without all three documents                                               | Refused by the database (`documents_missing`); the button is disabled.                                                  |
| Approving a doctor who hasn't confirmed their email                                 | Refused by the database (`email_not_confirmed`).                                                                        |
| Doctor tries to change their own status                                             | Their column grants on `doctor_profiles` don't include it, and `admin_review_doctor` refuses them.                      |
| Replacing files after a decision                                                    | Refused (`verification_closed`), and no new upload link is issued, so the files stay as the admin saw them.             |
| Two admins review the same doctor                                                   | The second is refused (`already_reviewed`).                                                                             |
| Doctor sends new documents while an admin has the old ones open                     | The decision is refused (`details_changed`): the review page sends the `submitted_at` it showed, and the admin reloads. |
| Calling `save_verification_documents` directly with a file the server never checked | Refused (`upload_not_checked`), and a path the app didn't make is refused (`invalid_path`).                             |
| Doctor changes a verified field later                                               | Not handled yet (ADM-06).                                                                                               |
| Approved doctor without hours                                                       | Listed as "Not taking bookings", with no slots.                                                                         |

## Uploads

Documents go straight from the browser to Supabase Storage, never through a Server Action, because Vercel limits request bodies to 4.5 MB and three documents can reach 12 MB.

1. The browser checks each file's type and size, then asks `prepareDocumentUploads` for signed upload links. That action checks the doctor and that their documents can still change.
2. The browser uploads each file on its link. The bucket enforces 5 MB and the allowed file types on its own.
3. `saveVerificationDocuments` checks what actually arrived (path, size, type) and records each file that passes in `private.checked_uploads` through `mark_upload_checked` (secret key only). `save_verification_documents` takes a file only with that record, used once, at the path format the app makes. If anything fails, the new files are deleted; on success, the files they replace are.

Every upload gets a new path (`<doctor id>/<kind>-<uuid>.<ext>`) and no upsert, so a path takes one file and an old link can't swap a file after review. Storage has no insert policy on this bucket: a signed link is the only way in. Sign-up takes no files because the account doesn't exist yet, which also keeps anonymous visitors out of the bucket.

## Admins

- `admin` is a role in `app_metadata`, like the others. Accounts come only from `npm run admin:create -- email "Full Name"`, which prints a generated password once. Sign-up can't create one.
- Admins log in at `/login/admin`, and every admin page needs a second factor (authenticator app, Supabase TOTP). The first login pairs the app at `/admin/two-factor`; later logins ask for a code there.
- The real check is in the database: `private.is_admin()` needs the role and an `aal2` session, so a stolen password reaches nothing, even by calling the functions directly. `requireAdmin()` is the friendly redirect in front of it.
- Admin pages use the admin's own session, never the secret key, so these rules always apply. The secret key alone can't review a doctor.
- Document links are signed for 5 minutes (SEC-07), under a storage policy that also needs `private.is_admin()`.

## Audit log

`audit_log` is append-only: nobody has update or delete rights, not even the secret key, and entries are written only by `private.write_audit`, inside the same transaction as the action they record. It holds ids and action names, never free text or health content, so the admin's note isn't in it.

Today it records document submissions and review decisions. The rest of SEC-04 (sign-ins, prescriptions, consent, hashed IP) is still to come. `/admin/audit-log` filters by action and date; clicking a person shows everything they did or had done to them. The user filter uses ids, so no email address ends up in a URL.

## Data

Migration `supabase/migrations/20261030120000_doctor_verification.sql`:

- `doctor_profiles`: `verification_status`, `verification_note`, `verified_at`, `verified_by`, `license_document_path`.
- `doctor_directory`: only `approved` doctors with a confirmed email, plus `license_number`. `get_doctor_slots` and `book_appointment` read through it, so hiding a doctor also stops their bookings.
- `audit_log`, `private.write_audit`, `private.is_admin`.
- Functions: `save_verification_documents`, `admin_doctor_reviews`, `admin_review_doctor`, `admin_audit_log`.

Existing doctors stay `pending` when the migration runs. `npm run db:seed` marks the demo doctors approved.

## Tests

`npm run test:db` covers every rule here, plus booking and the call window (the start of QA-02). It needs no local database: it runs against the project in `.env.local` with temporary accounts and deletes them afterwards. Like the seed script, it refuses to run unless `SEED_PROJECT_REF` names the project, so it can't touch production by accident. Its audit log entries stay behind, because that table can't be deleted from.

## Labs (ADM-04)

Labs go through the same review as doctors, with the same statuses and rules. Migration: `supabase/migrations/20261107180000_lab_verification.sql`; the same upload and stale-decision checks came to doctors in `20261107200000_doctor_verification_checks.sql`. Code: `src/features/lab-verification/`.

1. A lab signs up with its name, registration number and address. It starts as `pending`: it can sign in and use its dashboard, but it isn't in `lab_directory`, so patients can't find or book it. The overview shows a banner, and `/lab/verification` shows the status and checklist.
2. On that page the lab chooses who licensed it, confirms the licence number and the address on the licence, and uploads the licence (PDF, JPG or PNG, up to 5 MB). Sending puts it back in the queue as `pending`.
3. An admin opens the lab from `/admin/labs`, checks the licence with the authority, and approves, asks for more information or rejects. The lab gets an email that only says there's an update, plus a bell notice linking to `/lab/verification`.

| Case                                                                          | What happens                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Approving without the licence or the licensing authority                      | Refused by the database (`documents_missing`); the button is disabled.                                                                                                                                                                                   |
| Approving a lab that hasn't confirmed its email                               | Refused (`email_not_confirmed`). An approved lab with an unconfirmed email still stays out of `lab_directory`.                                                                                                                                           |
| Lab changes its status, licence number, address or licence file directly      | Its column grants on `lab_profiles` cover only name, contact person, phone and services. The rest changes only through `save_lab_verification`.                                                                                                          |
| Changing details after a decision                                             | Refused (`verification_closed`), and no upload link is issued. Changes after approval wait for ADM-06.                                                                                                                                                   |
| Two admins review the same lab                                                | The second is refused (`already_reviewed`).                                                                                                                                                                                                              |
| A new licence replaces an old one                                             | `save_lab_verification` returns the old path and the app deletes that file.                                                                                                                                                                              |
| Calling `save_lab_verification` directly with a file the server never checked | Refused (`upload_not_checked`). The server records each file `verifyUpload` passes in `private.checked_uploads` through `mark_upload_checked` (secret key only); the save takes the record once. A path the app didn't make is refused (`invalid_path`). |
| The lab sends new details while an admin has the old ones open                | The decision is refused (`details_changed`): the review page sends the `submitted_at` it showed, and the admin reloads.                                                                                                                                  |
| A lab session without the second factor                                       | Refused by the actions and the database (`second_factor_required`).                                                                                                                                                                                      |
| A save fails after the upload                                                 | The app deletes the new file, but only inside the lab's own folder.                                                                                                                                                                                      |

Anything that shows labs to patients (LAB-02, LAB-03) must read through `lab_directory`. Today the patient lab pages still show sample data.

### Choices

- **Who licenses labs.** Private clinical labs need a licence from the provincial healthcare commission where they operate: Punjab Healthcare Commission, Sindh Healthcare Commission, Khyber Pakhtunkhwa Health Care Commission, Islamabad Healthcare Regulatory Authority or Balochistan Healthcare Commission. Labs pick one, or "Another authority". The review page links to the Punjab commission's public licence lookup ([os.phc.org.pk/verify.aspx](https://os.phc.org.pk/verify.aspx)). The other commissions publish no lookup we could find, so the admin checks with them directly. Unlicensed labs are being sealed and fined in Punjab ([Dawn](https://www.dawn.com/news/1439333), [The News](https://thenews.com.pk/amp/1274012-23-labs-diagnostic-centres-sealed)), and Sindh registration and licensing are online but slow ([Dawn](https://www.dawn.com/news/1926771)).
- **Accreditation is not licensing.** ISO 15189 accreditation from PNAC ([pnac.gov.pk](https://www.pnac.gov.pk/Medical-Laboratories/Withdrawal)) covers only some labs, so it isn't required. It can become an optional badge later.
- **Licence expiry** isn't tracked yet (ADM-14).
- **Files** follow the doctor pattern: a private `lab-documents` bucket that takes PDF, JPEG and PNG up to 5 MB, with paths `<lab id>/license-<uuid>.<ext>`. A signed upload link is issued only while the lab is under review, and `verifyUpload` checks every file. There is no insert policy, and admins read through a 5-minute signed link under `private.is_admin()`. Upload links count toward `rateLimits.uploadUser`, and each save counts toward `rateLimits.verificationUser`.
- **Shared parts.** The status types are in `src/lib/verification.ts`, the update email and `notifyReviewed` in `src/lib/verification-notifications.server.ts`, and `createSignedUpload` and `MB` in `src/lib/uploads/`. The status badge, decision dialog, banner, checklist and document link are in `src/components/shared/`, so doctor and lab reviews look and behave the same.
