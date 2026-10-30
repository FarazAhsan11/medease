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

| Case                                                | What happens                                                                                                |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Approving without all three documents               | Refused by the database (`documents_missing`); the button is disabled.                                      |
| Approving a doctor who hasn't confirmed their email | Refused by the database (`email_not_confirmed`).                                                            |
| Doctor tries to change their own status             | Their column grants on `doctor_profiles` don't include it, and `admin_review_doctor` refuses them.          |
| Replacing files after a decision                    | Refused (`verification_closed`), and no new upload link is issued, so the files stay as the admin saw them. |
| Two admins review the same doctor                   | The second is refused (`already_reviewed`).                                                                 |
| Doctor changes a verified field later               | Not handled yet (ADM-06).                                                                                   |
| Approved doctor without hours                       | Listed as "Not taking bookings", with no slots.                                                             |

## Uploads

Documents go straight from the browser to Supabase Storage, never through a Server Action, because Vercel limits request bodies to 4.5 MB and three documents can reach 12 MB.

1. The browser checks each file's type and size, then asks `prepareDocumentUploads` for signed upload links. That action checks the doctor and that their documents can still change.
2. The browser uploads each file on its link. The bucket enforces 5 MB and the allowed file types on its own.
3. `saveVerificationDocuments` checks what actually arrived (path, size, type), records it through `save_verification_documents`, and deletes any file it replaces.

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
