# Lab staff accounts (LAB-07)

A lab is one organisation with several people signing in. The account that registered the lab is its **lab admin**; the admin invites staff, gives each a role, changes it, and removes people. Each person signs in with their own email, password and authenticator app, so every change the lab makes is recorded against a person.

## Roles

What each role can do. The database holds the matrix (`private.lab_role_can`); `src/features/lab-staff/lib/lab-permissions.ts` repeats it to decide which pages and buttons to show.

| Permission | Lab admin | Front desk | Sample collector | Pathologist |
| --- | --- | --- | --- | --- |
| See bookings (`bookings.view`) | yes | yes | yes | yes |
| Mark a sample collected (`bookings.collect`) | yes | yes | yes | |
| Move to processing, ask for a new sample (`bookings.process`) | yes | | | yes |
| Cancel a booking (`bookings.cancel`) | yes | yes | | |
| Open reports (`reports.view`) | yes | yes | | yes |
| Upload a report (`reports.publish`) | yes | | | yes |
| Test catalog, home collection, lab profile and verification, staff | yes | | | |

This follows the WHO laboratory quality checklist's split of rights into read, enter and change, given per job. "Pathologist" covers the people who run and report tests. Sign-off rights (LAB-17) will be given to this role.

There is one lab admin per lab: the account that registered it. The admin can't be removed or demoted, so a lab can never lose its last admin. Handing the lab to someone else is a support task for now.

## How the database knows the lab

- `lab_members` has one row per person: `user_id` (primary key), `lab_id`, `role`, `status` (`invited`, `active`, `removed`), who invited and removed them, and when. The admin's row has `user_id = lab_id`, and a check keeps the `admin` role to that row only. A trigger adds it when a `lab_profiles` row is inserted, and the migration backfills existing labs.
- `lab_id` everywhere still means `lab_profiles.id` (the admin's user id), so no lab table or index changes.
- Staff don't read `lab_profiles` (it holds the licence path and the review note). `get_lab_membership()` returns the caller's lab id, role, status and the lab's name in one call, which `requireLabMember` makes once per request.
- `private.current_lab_id()` returns the caller's lab while their row is `active` and their token says role `lab`; `private.lab_can(permission)` checks their role. Both are `stable security definer`, and policies call them as `(select ...)` so Postgres evaluates them once per query, not per row (Supabase RLS performance guide).
- Writes go through `private.lab_caller(permission)`. It raises `not_lab` for anyone who isn't an active member and `not_permitted` for a role without that right, and returns the lab id. Every lab function now starts with it instead of `auth.uid()`. `move_lab_booking` picks the permission from the target status.
- Membership is read from the table on every request, not baked into the token. A Custom Access Token hook would save the lookup, but its claims stay valid until the token expires (up to an hour), so a removed collector could keep reading patient addresses. The lookup is a primary-key read.
- `app_metadata.lab_role` holds the staff role too, written only with the secret key. The header uses it to show only the links a person can use, with no extra query. A missing value means the admin. It may lag a role change by up to an hour; it decides links only, never access.

## Inviting

1. The admin enters a name, an email and a role on `/lab/staff`. The action checks `lab_can('staff')`, applies the `labStaffInvite` rate limit, and creates the account with the admin API: role `lab`, `lab_role` set, email unconfirmed, no password.
2. `add_lab_staff` (called with the admin's own session) adds the `invited` row. It accepts only an account that is a lab account, unconfirmed, never signed in, created in the last 10 minutes and not already a member, so it can't be pointed at someone else's account. A lab can hold 50 people besides the admin.
3. A token for `lab_invite` (7 days) goes into `auth_tokens`, hashed like confirmation tokens, and the email links to `/lab-invite?token=…`. The email names the lab and the role but no patient or clinical detail, and the subject names no one.
4. The invitee sets a password. The action consumes the token in one `UPDATE` (single use, safe against a double submit), sets the password, confirms the email, and calls `accept_lab_invite` with the secret key to make the row `active`. Then it signs them in. `requireRole` takes them through two-factor setup and consent like any lab account.

An email that already has a MedEase account can't be invited: one account has one role. The admin is told to use another address.

Invites can be sent again at any time (a new token replaces the old one; the usual one-minute cooldown applies) and withdrawn, which deletes the account if nobody has used it and bans it otherwise. The accept action checks the invitation is still open before it sets a password, so a withdrawn invite leaves no working login behind. Other auth tokens (password reset, confirmation) prune only expired or used rows, so they never remove a live invitation.

Someone who uses "Forgot password" before accepting gets signed in but stays `invited`; the access-ended page then tells them to open their invitation instead of saying they were removed.

## Removing and changing roles

- `remove_lab_staff` marks the row `removed`, with who and when. Access ends at once, because every check reads the row. The action then bans the account with the admin API, so the session can't be refreshed, and retires any unused tokens. The row and the person's id stay, so the booking history still says who did what (ISO 15189 keeps authorisation records rather than deleting them).
- Inviting the same email again reopens that row: `restore_lab_staff(email, role)` (admin, two-factor, staff limit) turns a removed member of the caller's lab back into an invitation and returns their id, or null when the email isn't one, which the app reports as in use. The account stays banned until they accept, which lifts the ban with the new password.
- `set_lab_staff_role` changes a role, and the action updates `app_metadata.lab_role`.
- Each of these writes an `audit_log` entry with ids only.
- A removed person who is still signed in lands on `/lab/access-ended`, which only offers sign out.

## Notifications

Booking notices (new, cancelled, rescheduled) go to every active member whose role can collect samples (admin, front desk, collectors; `private.lab_role_can(role, 'bookings.collect')`) through `private.notify_lab`, one row each, written by the same triggers as before. Labs have only a few people, so this stays a single insert. Verification notices still go to the admin only.

## Not in this step

- Sign-off (LAB-17), sample tracking with who did each step (LAB-16), and the collector's day view (LAB-21) build on these roles.
- Choosing which collector gets a home collection (LAB-06).
- More than one admin, and moving the lab to a new admin.
- Staff accept the same documents as the lab admin, including the partner terms. Whether staff should accept only the terms and privacy policy is for counsel (CMPL-03).

## Sources

- Supabase, Row Level Security performance: wrap functions in `select` and use security definer helpers. https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase, Custom Claims and RBAC; Custom Access Token Hook (claims are fixed when the token is issued). https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac, https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
- OWASP Forgot Password Cheat Sheet (random single-use tokens, stored hashed, with an expiry), applied to invitations. https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- WHO Laboratory Quality Stepwise Implementation, information management checklist (rights to access, enter and change, per person). https://extranet.who.int/lqsi/checklist/14
- ISO 15189:2022, clause 6.2 (personnel authorisation records are kept).
