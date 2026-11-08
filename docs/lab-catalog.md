# Lab catalog (LAB-01, LAB-02)

Labs list the tests and packages they offer, with their own price, turnaround and home collection. Patients and guests browse by category or name and compare the same test across labs. Booking (LAB-03) builds on this.

## Choices

**One shared list of tests, priced by each lab.** `lab_test_types` is MedEase's list of orderable tests (name, other names people search for, category, sample type, description, default preparation). A lab doesn't type test names: it picks a test from the list and sets its price, turnaround, home collection and, if it differs, its own preparation note (`lab_tests`, one row per lab and test). This is how lab networks keep compendiums comparable: each lab's catalog maps onto a shared code set (Health Gorilla's lab compendium maps every partner lab's tests to standard codes; LOINC publishes Universal Lab Order Codes for the most frequent orders). Without it, "CBC", "Complete blood count" and "CBC with ESR" from three labs could never be compared (LAB-02). `loinc_code` is there for the mapping and filled in later; it isn't needed to compare tests within MedEase.

- The list is written by migrations for now: about 45 tests that are common in Pakistan. A lab that needs a test not on it asks support. An admin editor and CSV import (LAB-24) come later.
- Ids are short slugs (`cbc`, `hba1c`), stable and readable in URLs. A test name in a URL is public catalog data, not about a person.

**Packages are made from the lab's own tests.** `lab_packages` has a name, description and price; `lab_package_items` points at the lab's `lab_tests` rows, paired by a foreign key on `(id, lab_id)`, so a package can't include another lab's test. What follows from the tests is derived, never stored: the separate price (sum of the tests), turnaround (the slowest test) and home collection (only if every test allows it). A package that includes a test the lab has unlisted is hidden from patients, and the lab sees why.

**Turnaround is a number of hours** (`turnaround_hours`), chosen from a short list (4 hours to 14 days). LAB-19 promises a report time from it, and the app shows "6 hours", "24 hours", "3 days".

**Prices are whole rupees**, like doctors' fees.

**Nothing is deleted except packages.** A lab unlists a test instead. When bookings arrive (LAB-03) they snapshot the name and price, so later edits don't change a booked order; deleting a package that has bookings will be refused then.

**Writes go through functions, reads through views.** Labs read their own rows directly (RLS: `lab_id = auth.uid()`) and write only through `save_lab_test`, `set_lab_test_listed`, `save_lab_package`, `set_lab_package_listed` and `delete_lab_package`, which check the caller is a lab that has passed two-factor. Patients and guests read through views that, like `lab_directory`, expose only public columns and only listed items from labs in `lab_directory` (approved, email confirmed): `lab_test_offers` (one row per lab and test), `lab_test_catalog` (one row per test with the number of labs, lowest price, fastest turnaround) and `lab_package_offers`. A lab can build its catalog while verification is pending; patients see it from approval.

**Search** matches a test's name and other names (`HbA1c`, "sugar test") with `ilike` on a lowercased `search_text` column with a trigram GIN index (pg_trgm), which serves `ilike '%…%'`. The list is small today; the index keeps it fast as it grows. Filters and paging live in the URL, as in the doctor directory, so results are shareable and work without JavaScript.

**Known limit: the browse pages aggregate on each request.** `lab_test_catalog` and `lab_package_offers` group every listed offer each time `/lab-tests` loads (twice, with the page count), and `lab_directory` checks each lab's confirmed email. This is a few milliseconds for tens of labs and stays fine into the low hundreds. The comparison page doesn't have this problem: `lab_test_offers` filtered by one test uses `lab_tests_compare_idx`. Before the catalog reaches a few hundred labs, replace the two aggregate views with a summary table, one row per test and one per package, kept by triggers. Every change that puts an offer in or out of `lab_directory` must recompute it: catalog writes, lab approval or suspension, and email confirmation. Then make the views plain indexed reads of that table.

**Limits.** At most 50 packages per lab and 2 to 30 tests in a package. Catalog edits count against `rateLimits.catalogUser` (300 an hour per lab account: switching tests on and off is one write each).

## Screens

- Lab: `/lab/tests` lists the lab's tests (search by name) and packages. A sheet adds or edits a test or package; a switch lists or unlists each one.
- Guests: `/lab-tests` (categories, search, packages) and `/lab-tests/[testId]` (labs offering the test, cheapest first). Signed-in patients are sent to `/patient/lab-tests/book` and `/patient/lab-tests/book/[testId]`, the same screens inside their area. Booking a lab opens with LAB-03; until then the compare page says so.

## Sources

- LOINC, lab orders and the Universal Lab Order Codes value set: https://loinc.org/usage/orders
- Health Gorilla, lab compendium (each lab's catalog mapped to standard codes): https://apidocs.healthgorilla.com/guides/lab-network/lab-compendium
- PostgreSQL, pg_trgm (GIN trigram indexes serve `LIKE`/`ILIKE`): https://www.postgresql.org/docs/current/pgtrgm.html
- PostgreSQL, `CREATE VIEW` and `security_invoker`: https://www.postgresql.org/docs/current/sql-createview.html
