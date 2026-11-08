-- MedEase: lab catalog (LAB-01, LAB-02). Safe to run more than once. Run after
-- the doctor verification checks migration. Design: docs/lab-catalog.md.
--
-- lab_test_types is MedEase's shared list of orderable tests. Each lab picks
-- tests from it and sets its own price, turnaround and home collection
-- (lab_tests), so the same test can be compared across labs. Packages group a
-- lab's own tests at one price. Labs read their own rows and write only through
-- the functions below; patients and guests read through views that show only
-- listed items from labs in lab_directory.

create extension if not exists pg_trgm with schema extensions;

-- The shared list ---------------------------------------------------------------

create table if not exists public.lab_test_types (
  id text primary key
    check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 40),
  name text not null unique check (char_length(name) between 2 and 120),
  -- Other names people search for, e.g. "blood cp" for a CBC. Search only.
  aliases text not null default '' check (char_length(aliases) <= 300),
  category text not null check (category in (
    'blood', 'diabetes', 'heart', 'thyroid', 'liver_kidney', 'vitamins',
    'infections', 'hormones', 'urine_stool'
  )),
  sample_type text not null check (sample_type in ('blood', 'urine', 'stool')),
  description text not null check (char_length(description) between 1 and 400),
  preparation text not null check (char_length(preparation) between 1 and 300),
  -- LOINC order code, for mapping to other systems later.
  loinc_code text check (loinc_code ~ '^[0-9]{1,7}-[0-9]$'),
  search_text text generated always as (lower(name || ' ' || aliases)) stored
);

create index if not exists lab_test_types_search_idx
  on public.lab_test_types using gin (search_text extensions.gin_trgm_ops);
create index if not exists lab_test_types_category_idx
  on public.lab_test_types (category, name);

alter table public.lab_test_types enable row level security;
revoke all on public.lab_test_types from public, anon, authenticated, service_role;
grant select on public.lab_test_types to anon, authenticated;

drop policy if exists "Anyone reads the test list" on public.lab_test_types;
create policy "Anyone reads the test list" on public.lab_test_types
  for select to anon, authenticated
  using (true);

insert into public.lab_test_types
  (id, name, aliases, category, sample_type, description, preparation)
values
  ('cbc', 'Complete Blood Count (CBC)', 'cbc, blood cp, full blood count, hemoglobin, haemoglobin, platelets', 'blood', 'blood',
   'Counts red cells, white cells and platelets to check for anaemia, infection and other conditions.',
   'No special preparation needed.'),
  ('esr', 'Erythrocyte Sedimentation Rate (ESR)', 'esr, sed rate', 'blood', 'blood',
   'A general marker of inflammation in the body.',
   'No special preparation needed.'),
  ('blood-group', 'Blood Group and Rh Factor', 'blood type, abo, rh', 'blood', 'blood',
   'Finds your blood group (A, B, AB or O) and whether you are Rh positive or negative.',
   'No special preparation needed.'),
  ('pt-inr', 'Prothrombin Time (PT/INR)', 'pt, inr, clotting time', 'blood', 'blood',
   'Measures how long blood takes to clot. Used to check blood thinners such as warfarin.',
   'Tell the lab if you take a blood thinner.'),
  ('aptt', 'Activated Partial Thromboplastin Time (APTT)', 'aptt, ptt, clotting time', 'blood', 'blood',
   'Another clotting test, often done before surgery or to monitor heparin.',
   'Tell the lab if you take a blood thinner.'),
  ('iron-profile', 'Iron Profile', 'iron, tibc, transferrin, iron studies', 'blood', 'blood',
   'Measures iron, iron-binding capacity and transferrin saturation to look for iron deficiency or overload.',
   'A morning sample after an overnight fast is preferred. Water is fine.'),
  ('ferritin', 'Serum Ferritin', 'ferritin, iron stores', 'blood', 'blood',
   'Shows how much iron your body has stored.',
   'No special preparation needed.'),
  ('hb-electrophoresis', 'Haemoglobin Electrophoresis', 'thalassemia, thalassaemia, hb electrophoresis, sickle cell', 'blood', 'blood',
   'Identifies the types of haemoglobin in your blood to screen for thalassaemia and sickle cell disease.',
   'No special preparation needed.'),

  ('fasting-glucose', 'Fasting Blood Sugar', 'fbs, fasting glucose, sugar test', 'diabetes', 'blood',
   'Measures blood glucose after an overnight fast to screen for or monitor diabetes.',
   'Fast for at least 8 hours before the test. Water is fine.'),
  ('random-glucose', 'Random Blood Sugar', 'rbs, random glucose, sugar test', 'diabetes', 'blood',
   'Measures blood glucose at any time of day.',
   'No special preparation needed.'),
  ('hba1c', 'HbA1c', 'a1c, glycated haemoglobin, glycosylated hemoglobin, average sugar', 'diabetes', 'blood',
   'Shows your average blood sugar over the last 2 to 3 months.',
   'No fasting needed.'),
  ('ogtt', 'Oral Glucose Tolerance Test (OGTT)', 'gtt, glucose tolerance, gestational diabetes', 'diabetes', 'blood',
   'Measures blood sugar before and after a sweet drink. Often done in pregnancy.',
   'Fast for 8 to 12 hours. Plan to stay at the lab for 2 to 3 hours.'),
  ('urine-microalbumin', 'Urine Microalbumin', 'microalbumin, acr, albumin creatinine ratio', 'diabetes', 'urine',
   'Finds small amounts of protein in urine, an early sign of kidney damage from diabetes.',
   'An early morning urine sample is preferred.'),

  ('lipid-profile', 'Lipid Profile', 'cholesterol, triglycerides, ldl, hdl, lipid panel', 'heart', 'blood',
   'Measures cholesterol and triglycerides to assess your risk of heart disease.',
   'Your doctor may ask you to fast for 9 to 12 hours. Water is fine.'),
  ('troponin-i', 'Troponin I', 'troponin, trop i, heart attack', 'heart', 'blood',
   'Detects damage to heart muscle. If you have chest pain now, go to an emergency department instead.',
   'No special preparation needed.'),
  ('hs-crp', 'High-Sensitivity CRP (hs-CRP)', 'hscrp, cardiac crp', 'heart', 'blood',
   'Measures low levels of inflammation linked with heart disease risk.',
   'No special preparation needed.'),

  ('tsh', 'Thyroid Stimulating Hormone (TSH)', 'tsh, thyroid', 'thyroid', 'blood',
   'The main screening test for an underactive or overactive thyroid.',
   'No special preparation needed.'),
  ('thyroid-profile', 'Thyroid Profile (T3, T4, TSH)', 'tft, thyroid function test, t3 t4 tsh', 'thyroid', 'blood',
   'Measures thyroid hormones to check how your thyroid is working.',
   'If you take thyroid medicine, ask your doctor whether to take it before the test.'),
  ('free-t4', 'Free T4', 'ft4, free thyroxine', 'thyroid', 'blood',
   'Measures the active form of the main thyroid hormone.',
   'If you take thyroid medicine, ask your doctor whether to take it before the test.'),
  ('anti-tpo', 'Anti-TPO Antibodies', 'tpo, thyroid antibodies, thyroid peroxidase', 'thyroid', 'blood',
   'Looks for antibodies that point to autoimmune thyroid disease, such as Hashimoto''s.',
   'No special preparation needed.'),

  ('lft', 'Liver Function Test (LFT)', 'lft, liver profile, alt, sgpt, ast, bilirubin', 'liver_kidney', 'blood',
   'Measures liver enzymes, proteins and bilirubin to check how your liver is working.',
   'No special preparation needed.'),
  ('rft', 'Renal Function Test (RFT)', 'kft, rft, kidney function, urea, creatinine', 'liver_kidney', 'blood',
   'Measures urea, creatinine and electrolytes to check how your kidneys are working.',
   'No special preparation needed.'),
  ('serum-creatinine', 'Serum Creatinine', 'creatinine, egfr, kidney', 'liver_kidney', 'blood',
   'A single marker of kidney function, usually reported with an estimated filtration rate (eGFR).',
   'No special preparation needed.'),
  ('uric-acid', 'Uric Acid', 'gout, urate', 'liver_kidney', 'blood',
   'Measures uric acid. High levels can cause gout and kidney stones.',
   'No special preparation needed.'),
  ('electrolytes', 'Serum Electrolytes', 'sodium, potassium, chloride, na k', 'liver_kidney', 'blood',
   'Measures sodium, potassium and chloride in the blood.',
   'No special preparation needed.'),

  ('vitamin-d', 'Vitamin D (25-OH)', 'vit d, 25 hydroxy vitamin d', 'vitamins', 'blood',
   'Checks for vitamin D deficiency, a common cause of tiredness and bone pain.',
   'No special preparation needed.'),
  ('vitamin-b12', 'Vitamin B12', 'b12, cobalamin', 'vitamins', 'blood',
   'Checks for vitamin B12 deficiency, which can cause anaemia and numbness.',
   'No special preparation needed.'),
  ('folate', 'Serum Folate', 'folic acid', 'vitamins', 'blood',
   'Checks for folate deficiency, a cause of anaemia that also matters in pregnancy.',
   'No special preparation needed.'),
  ('serum-calcium', 'Serum Calcium', 'calcium, ca', 'vitamins', 'blood',
   'Measures calcium, which bones, nerves and muscles need.',
   'No special preparation needed.'),
  ('magnesium', 'Serum Magnesium', 'mg', 'vitamins', 'blood',
   'Measures magnesium, which muscles, nerves and heart rhythm depend on.',
   'No special preparation needed.'),

  ('hbsag', 'Hepatitis B Surface Antigen (HBsAg)', 'hepatitis b, hep b, hbsag', 'infections', 'blood',
   'Screens for a current hepatitis B infection.',
   'No special preparation needed.'),
  ('anti-hcv', 'Hepatitis C Antibody (Anti-HCV)', 'hepatitis c, hep c, hcv', 'infections', 'blood',
   'Screens for hepatitis C infection, now or in the past.',
   'No special preparation needed.'),
  ('hiv-screening', 'HIV 1 and 2 Antibodies', 'hiv', 'infections', 'blood',
   'Screens for HIV infection.',
   'No special preparation needed.'),
  ('typhidot', 'Typhoid IgM (Typhidot)', 'typhoid, typhidot, enteric fever', 'infections', 'blood',
   'A rapid blood test for typhoid fever.',
   'No special preparation needed.'),
  ('dengue-ns1', 'Dengue NS1 Antigen', 'dengue', 'infections', 'blood',
   'Detects dengue infection in the first days of a fever.',
   'No special preparation needed.'),
  ('malaria-parasite', 'Malaria Parasite (MP)', 'malaria, mp, ict malaria', 'infections', 'blood',
   'Looks for malaria parasites in the blood.',
   'No special preparation needed.'),
  ('crp', 'C-Reactive Protein (CRP)', 'crp', 'infections', 'blood',
   'A marker of infection or inflammation in the body.',
   'No special preparation needed.'),
  ('h-pylori-stool', 'H. pylori Stool Antigen', 'h pylori, helicobacter, stomach infection, ulcer', 'infections', 'stool',
   'Detects the stomach infection that can cause ulcers.',
   'If you take acid-reducing medicines or antibiotics, ask your doctor whether to stop them before the test.'),

  ('beta-hcg', 'Beta hCG (Pregnancy Blood Test)', 'pregnancy test, bhcg, hcg', 'hormones', 'blood',
   'Confirms pregnancy and measures the pregnancy hormone.',
   'No special preparation needed.'),
  ('prolactin', 'Prolactin', 'prl', 'hormones', 'blood',
   'Measures a hormone that affects periods, fertility and breast milk.',
   'A morning sample, after resting for a while, is preferred.'),
  ('fsh', 'Follicle Stimulating Hormone (FSH)', 'fsh, fertility', 'hormones', 'blood',
   'A hormone tested for fertility and menopause.',
   'Women are often tested on day 2 to 5 of their cycle. Follow your doctor''s advice.'),
  ('lh', 'Luteinising Hormone (LH)', 'lh, luteinizing hormone, fertility', 'hormones', 'blood',
   'A hormone that controls ovulation and testosterone.',
   'Women are often tested on day 2 to 5 of their cycle. Follow your doctor''s advice.'),
  ('testosterone', 'Total Testosterone', 'testosterone', 'hormones', 'blood',
   'Measures the main male sex hormone. Also tested in women.',
   'A morning sample is preferred.'),

  ('urine-re', 'Urine Routine Examination', 'urine re, urine dr, urinalysis, urine test', 'urine_stool', 'urine',
   'Screens for urinary infections, kidney problems and sugar in the urine.',
   'Collect a midstream sample, ideally the first urine of the morning.'),
  ('urine-culture', 'Urine Culture and Sensitivity', 'urine c/s, urine culture', 'urine_stool', 'urine',
   'Grows bacteria from urine to confirm an infection and find which antibiotics work.',
   'Collect a midstream sample in a sterile container, before starting antibiotics if you can.'),
  ('stool-re', 'Stool Routine Examination', 'stool test, stool re, stool dr', 'urine_stool', 'stool',
   'Checks stool for infection, parasites and blood.',
   'Collect a fresh sample in a clean container.'),
  ('stool-occult-blood', 'Stool Occult Blood', 'fobt, occult blood', 'urine_stool', 'stool',
   'Finds hidden blood in stool.',
   'Follow any diet advice from your lab.')
on conflict (id) do update
set name = excluded.name,
    aliases = excluded.aliases,
    category = excluded.category,
    sample_type = excluded.sample_type,
    description = excluded.description,
    preparation = excluded.preparation;

-- Each lab's tests ----------------------------------------------------------------

create table if not exists public.lab_tests (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.lab_profiles (id) on delete cascade,
  test_type_id text not null references public.lab_test_types (id),
  price integer not null check (price between 1 and 1000000),
  turnaround_hours integer not null check (turnaround_hours between 1 and 720),
  home_collection boolean not null default false,
  -- The lab's own note, shown instead of the shared one.
  preparation text check (char_length(preparation) between 1 and 300),
  listed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lab_id, test_type_id),
  -- Lets package items name a test and its lab together.
  unique (id, lab_id)
);

-- Comparing one test across labs, cheapest first.
create index if not exists lab_tests_compare_idx
  on public.lab_tests (test_type_id, price) where listed;

create table if not exists public.lab_packages (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.lab_profiles (id) on delete cascade,
  name text not null check (char_length(name) between 3 and 80),
  description text check (char_length(description) between 1 and 300),
  price integer not null check (price between 1 and 1000000),
  listed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, lab_id)
);

create index if not exists lab_packages_lab_idx
  on public.lab_packages (lab_id, created_at);
create index if not exists lab_packages_price_idx
  on public.lab_packages (price) where listed;

-- A package holds only its own lab's tests: both keys carry lab_id.
create table if not exists public.lab_package_items (
  package_id uuid not null,
  lab_id uuid not null,
  lab_test_id uuid not null,
  primary key (package_id, lab_test_id),
  foreign key (package_id, lab_id)
    references public.lab_packages (id, lab_id) on delete cascade,
  foreign key (lab_test_id, lab_id)
    references public.lab_tests (id, lab_id) on delete cascade
);

create index if not exists lab_package_items_test_idx
  on public.lab_package_items (lab_test_id);

do $$
declare
  catalog_table text;
begin
  foreach catalog_table in array array['lab_tests', 'lab_packages']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', catalog_table);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()',
      catalog_table
    );
  end loop;

  foreach catalog_table in array array['lab_tests', 'lab_packages', 'lab_package_items']
  loop
    execute format('alter table public.%I enable row level security', catalog_table);
    execute format(
      'revoke all on public.%I from public, anon, authenticated, service_role',
      catalog_table
    );
    execute format('grant select on public.%I to authenticated', catalog_table);
    execute format('drop policy if exists "Labs read their catalog" on public.%I', catalog_table);
    execute format(
      'create policy "Labs read their catalog" on public.%I
         for select to authenticated
         using (lab_id = (select auth.uid()))',
      catalog_table
    );
  end loop;
end;
$$;

-- What patients and guests see ------------------------------------------------------
-- Only listed items from labs in lab_directory (approved, email confirmed), and
-- only public columns.

-- One row per lab and test.
create or replace view public.lab_test_offers
with (security_invoker = false) as
select
  t.id,
  t.lab_id,
  d.lab_name,
  d.address as lab_address,
  t.test_type_id,
  t.price,
  t.turnaround_hours,
  t.home_collection,
  coalesce(t.preparation, tt.preparation) as preparation
from public.lab_tests t
join public.lab_directory d on d.id = t.lab_id
join public.lab_test_types tt on tt.id = t.test_type_id
where t.listed;

-- One row per test that at least one lab offers. Filters on the test's own
-- columns are applied before the counting, since they're all grouped on.
create or replace view public.lab_test_catalog
with (security_invoker = false) as
select
  tt.id,
  tt.name,
  tt.category,
  tt.sample_type,
  tt.description,
  tt.search_text,
  count(*)::integer as lab_count,
  min(o.price) as lowest_price,
  min(o.turnaround_hours) as fastest_hours,
  bool_or(o.home_collection) as home_collection
from public.lab_test_types tt
join public.lab_test_offers o on o.test_type_id = tt.id
group by tt.id, tt.name, tt.category, tt.sample_type, tt.description, tt.search_text;

-- A package shows only while every test in it is listed. What follows from its
-- tests is worked out here: their separate price, the slowest turnaround, and
-- home collection only if every test allows it.
create or replace view public.lab_package_offers
with (security_invoker = false) as
select
  p.id,
  p.lab_id,
  d.lab_name,
  d.address as lab_address,
  p.name,
  p.description,
  p.price,
  sum(t.price)::integer as separate_price,
  max(t.turnaround_hours) as turnaround_hours,
  bool_and(t.home_collection) as home_collection,
  array_agg(tt.name order by tt.name) as test_names,
  lower(p.name) as search_text
from public.lab_packages p
join public.lab_directory d on d.id = p.lab_id
join public.lab_package_items i on i.package_id = p.id
join public.lab_tests t on t.id = i.lab_test_id
join public.lab_test_types tt on tt.id = t.test_type_id
where p.listed
group by p.id, d.lab_name, d.address
having bool_and(t.listed);

revoke all on public.lab_test_offers, public.lab_test_catalog, public.lab_package_offers
  from public, anon, authenticated, service_role;
grant select on public.lab_test_offers, public.lab_test_catalog, public.lab_package_offers
  to anon, authenticated;

-- Writing the catalog ------------------------------------------------------------------
-- Every function checks the caller is a lab that has passed two-factor, and
-- touches only that lab's rows.

-- Adds a test to the lab's catalog, or updates it if it's there already.
create or replace function public.save_lab_test(
  p_test_type_id text,
  p_price integer,
  p_turnaround_hours integer,
  p_home_collection boolean,
  p_preparation text default null,
  p_listed boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := auth.uid();
  v_id uuid;
begin
  if v_lab_id is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'lab' then
    raise exception 'not_lab';
  end if;
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;
  if not exists (select 1 from public.lab_profiles where id = v_lab_id) then
    raise exception 'lab_not_found';
  end if;
  if not exists (select 1 from public.lab_test_types where id = p_test_type_id) then
    raise exception 'unknown_test';
  end if;

  -- The table's checks refuse a price or turnaround out of range.
  insert into public.lab_tests (
    lab_id, test_type_id, price, turnaround_hours, home_collection,
    preparation, listed
  ) values (
    v_lab_id, p_test_type_id, p_price, p_turnaround_hours,
    coalesce(p_home_collection, false),
    nullif(trim(p_preparation), ''),
    coalesce(p_listed, true)
  )
  on conflict (lab_id, test_type_id) do update
  set price = excluded.price,
      turnaround_hours = excluded.turnaround_hours,
      home_collection = excluded.home_collection,
      preparation = excluded.preparation,
      listed = excluded.listed
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.save_lab_test(text, integer, integer, boolean, text, boolean) from public, anon;
grant execute on function public.save_lab_test(text, integer, integer, boolean, text, boolean) to authenticated;

create or replace function public.set_lab_test_listed(
  p_test_id uuid,
  p_listed boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := auth.uid();
begin
  if v_lab_id is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'lab' then
    raise exception 'not_lab';
  end if;
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;

  update public.lab_tests
  set listed = coalesce(p_listed, false)
  where id = p_test_id and lab_id = v_lab_id;

  if not found then
    raise exception 'test_not_found';
  end if;
end;
$$;

revoke execute on function public.set_lab_test_listed(uuid, boolean) from public, anon;
grant execute on function public.set_lab_test_listed(uuid, boolean) to authenticated;

-- Adds a package, or replaces one's details and tests when an id is given.
create or replace function public.save_lab_package(
  p_package_id uuid,
  p_name text,
  p_description text,
  p_price integer,
  p_test_ids uuid[],
  p_listed boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := auth.uid();
  v_test_ids uuid[];
  v_id uuid;
begin
  if v_lab_id is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'lab' then
    raise exception 'not_lab';
  end if;
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;

  -- One package save at a time per lab, so the count below holds.
  perform 1 from public.lab_profiles where id = v_lab_id for update;
  if not found then
    raise exception 'lab_not_found';
  end if;

  v_test_ids := array(
    select distinct test_id from unnest(p_test_ids) as test_id
    where test_id is not null
  );
  if cardinality(v_test_ids) not between 2 and 30 then
    raise exception 'package_size';
  end if;
  if (
    select count(*) from public.lab_tests
    where id = any (v_test_ids) and lab_id = v_lab_id
  ) <> cardinality(v_test_ids) then
    raise exception 'test_not_found';
  end if;

  if p_package_id is null then
    if (select count(*) from public.lab_packages where lab_id = v_lab_id) >= 50 then
      raise exception 'too_many_packages';
    end if;

    insert into public.lab_packages (lab_id, name, description, price, listed)
    values (
      v_lab_id, trim(p_name), nullif(trim(p_description), ''), p_price,
      coalesce(p_listed, true)
    )
    returning id into v_id;
  else
    update public.lab_packages
    set name = trim(p_name),
        description = nullif(trim(p_description), ''),
        price = p_price,
        listed = coalesce(p_listed, true)
    where id = p_package_id and lab_id = v_lab_id
    returning id into v_id;

    if v_id is null then
      raise exception 'package_not_found';
    end if;

    delete from public.lab_package_items
    where package_id = v_id and lab_test_id <> all (v_test_ids);
  end if;

  insert into public.lab_package_items (package_id, lab_id, lab_test_id)
  select v_id, v_lab_id, test_id from unnest(v_test_ids) as test_id
  on conflict do nothing;

  return v_id;
end;
$$;

revoke execute on function public.save_lab_package(uuid, text, text, integer, uuid[], boolean) from public, anon;
grant execute on function public.save_lab_package(uuid, text, text, integer, uuid[], boolean) to authenticated;

create or replace function public.set_lab_package_listed(
  p_package_id uuid,
  p_listed boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := auth.uid();
begin
  if v_lab_id is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'lab' then
    raise exception 'not_lab';
  end if;
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;

  update public.lab_packages
  set listed = coalesce(p_listed, false)
  where id = p_package_id and lab_id = v_lab_id;

  if not found then
    raise exception 'package_not_found';
  end if;
end;
$$;

revoke execute on function public.set_lab_package_listed(uuid, boolean) from public, anon;
grant execute on function public.set_lab_package_listed(uuid, boolean) to authenticated;

-- LAB-03 will refuse this for a package that has bookings.
create or replace function public.delete_lab_package(p_package_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := auth.uid();
begin
  if v_lab_id is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'lab' then
    raise exception 'not_lab';
  end if;
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;

  delete from public.lab_packages
  where id = p_package_id and lab_id = v_lab_id;

  if not found then
    raise exception 'package_not_found';
  end if;
end;
$$;

revoke execute on function public.delete_lab_package(uuid) from public, anon;
grant execute on function public.delete_lab_package(uuid) to authenticated;
