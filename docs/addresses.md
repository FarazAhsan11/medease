# Address book (PRO-07)

A patient keeps several saved addresses (home, parents' home, office) and picks one when booking a home sample collection (LAB-03) and, later, medicine delivery (PHM-12). This is the first piece of Milestone 2's lab booking work; LAB-06 (collection areas and slots) and LAB-03 (booking) build on it.

## What's saved

| Field | Rule | Why |
| --- | --- | --- |
| Label | Required, up to 40 characters ("Home", "Ammi's house", "Office") | The patient picks addresses by name at booking |
| Street address | Required, up to 200 characters, one multi-line box: house or flat, street, block or sector | Pakistani addresses vary too much for fixed lines (House 21, Street 5, G-10/2; R-727 Block 14; Flat 3, Plaza…); web.dev and Chrome recommend one `textarea` with `autocomplete="street-address"` |
| Area | Required, up to 80 characters (DHA Phase 5, Gulberg III, G-10) | Labs serve by area within a city (LAB-06) and collectors route by it |
| City | Required, chosen from a list | Service areas match on city, so free text ("lahore", "Lhr") would miss; the list is `src/lib/cities.ts`, and the database checks it against `private.cities()` (test:sql keeps the two in step) |
| Landmark | Optional, up to 120 characters | Common and needed in Pakistan, where house numbers alone often aren't enough to find a door |
| Contact name | Optional, up to 80 characters | Who to ask for at a parents' home or office |
| Contact phone | Required, same rule as the sign-up phone | The collector calls before arriving (LAB-21); filled in with the account phone for a new address |
| Default | One per account | Selected first at booking |

No postal code: it's rarely used for doorstep delivery in Pakistan and no service here routes by it. No map pin yet: the SRS settles on static map links first and geocoding later, which can add `latitude`/`longitude` columns without changing anything here.

Up to 10 addresses per account.

## Rules

- **Table** `patient_addresses`, owned by the account (`account_id` → `patient_profiles`). The address isn't tied to a care recipient: a family member is collected from whichever address the patient chooses.
- **Reads**: the owner only, through RLS, plus the restrictive second-factor policy, like the rest of the patient's personal data.
- **Writes**: only through `save_patient_address` and `delete_patient_address` (SECURITY DEFINER, check the caller is a patient and owns the row), plus the second-factor write trigger. The table grants `select` only.
- **Default**: a partial unique index allows one default per account. The first address saved becomes the default; saving one as default clears the old one; deleting the default makes the oldest remaining address the default, which is the first one in the list after it.
- **Bookings keep a copy**: LAB-03 will copy the address text onto the booking, as appointments copy the doctor's name. So an address can always be edited or deleted, and a past booking still shows where the sample was taken.
- **Rate limit**: `rateLimits.addressUser`, 60 saves or deletes an hour per account.
- **Concurrency**: each save or delete locks the account's `patient_profiles` row first, so two tabs can't pass the 10-address limit or leave two defaults.

## Existing home address

`patient_profiles.home_address` (PRO-01, one free-text line) stays as it is for now. When the address book is empty, the form for a new address starts with that text in the street box and "Home" as its label, so the patient doesn't type it twice. Retiring the single field is a later decision; nothing reads it for collection.

## Privacy

Addresses are personal, not clinical, data, but a home address with a phone number is enough to find someone, so it follows the patient-data rules: never in logs or URLs, not stored client-side, shown only to the patient. Labs will see the copy on a booking with them (LAB-03), and the privacy policy says so when that ships. For now the policy gains a "Saved addresses" line under what we collect.

## Code

- Migration: `supabase/migrations/20261108150000_patient_addresses.sql`
- Feature: `src/features/addresses/` (`lib/`, `schemas/`, `data/`, `actions/`, `components/`), shown as a card in patient settings.
- Cities: `src/lib/cities.ts`, shared with LAB-06.

## Sources

- web.dev, [Address form best practices](https://web.dev/articles/codelab-address-form-best-practices) and [Payment and address form best practices](https://web.dev/articles/payment-and-address-form-best-practices): one textarea for the street address, `autocomplete` tokens, labels above fields.
- Chrome for Developers, [Build an address form that follows best practice](https://developer.chrome.com/docs/modern-web-guidance/guides/forms/autofill-address-form): `street-address` needs a `textarea`; `address-level2` for the city.
- MDN, [autocomplete](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete): `address-level1` is the widest division (province), `address-level2` the city, `address-level3` the area within it.
- GeoPostcodes, [Pakistan address format](https://www.geopostcodes.com/country/pakistan/address-format/), and OpenStreetMap, [Addresses in Pakistan](https://wiki.openstreetmap.org/wiki/Addresses_in_Pakistan): house and street, then sector, block or colony, then city; landmarks used alongside.
