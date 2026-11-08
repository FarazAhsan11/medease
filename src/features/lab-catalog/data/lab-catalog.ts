import "server-only";

import { createClient } from "@/lib/supabase/server";

// The shared list a lab picks its tests from.
export type LabTestType = {
  id: string;
  name: string;
  category: string;
  sampleType: string;
  preparation: string;
};

// One test in a lab's own catalog.
export type LabCatalogTest = {
  id: string;
  testTypeId: string;
  name: string;
  category: string;
  sampleType: string;
  searchText: string;
  price: number;
  turnaroundHours: number;
  homeCollection: boolean;
  // The lab's own note, or null for the shared one.
  preparation: string | null;
  sharedPreparation: string;
  listed: boolean;
};

export type LabCatalogPackage = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  listed: boolean;
  testIds: string[];
};

type TestTypeRow = {
  id: string;
  name: string;
  category: string;
  sample_type: string;
  preparation: string;
  search_text: string;
};

type LabTestRow = {
  id: string;
  test_type_id: string;
  price: number;
  turnaround_hours: number;
  home_collection: boolean;
  preparation: string | null;
  listed: boolean;
  lab_test_types: TestTypeRow;
};

type LabPackageRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  listed: boolean;
  lab_package_items: { lab_test_id: string }[];
};

export async function getLabTestTypes(): Promise<LabTestType[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lab_test_types")
    .select("id, name, category, sample_type, preparation")
    .order("name")
    .returns<Omit<TestTypeRow, "search_text">[]>();

  if (error) throw new Error(`lab_test_types: ${error.message}`);

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    sampleType: row.sample_type,
    preparation: row.preparation,
  }));
}

// Everything in one lab's catalog. RLS limits it to the signed-in lab; the
// filter keeps the query on the lab's index.
export async function getLabCatalog(labId: string) {
  const supabase = await createClient();
  const [tests, packages] = await Promise.all([
    supabase
      .from("lab_tests")
      .select(
        "id, test_type_id, price, turnaround_hours, home_collection, preparation, listed, lab_test_types (id, name, category, sample_type, preparation, search_text)",
      )
      .eq("lab_id", labId)
      .returns<LabTestRow[]>(),
    supabase
      .from("lab_packages")
      .select(
        "id, name, description, price, listed, lab_package_items (lab_test_id)",
      )
      .eq("lab_id", labId)
      .order("created_at")
      .returns<LabPackageRow[]>(),
  ]);

  if (tests.error) throw new Error(`lab_tests: ${tests.error.message}`);
  if (packages.error) {
    throw new Error(`lab_packages: ${packages.error.message}`);
  }

  return {
    tests: tests.data
      .map((row): LabCatalogTest => ({
        id: row.id,
        testTypeId: row.test_type_id,
        name: row.lab_test_types.name,
        category: row.lab_test_types.category,
        sampleType: row.lab_test_types.sample_type,
        searchText: row.lab_test_types.search_text,
        price: row.price,
        turnaroundHours: row.turnaround_hours,
        homeCollection: row.home_collection,
        preparation: row.preparation,
        sharedPreparation: row.lab_test_types.preparation,
        listed: row.listed,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    packages: packages.data.map((row): LabCatalogPackage => ({
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      listed: row.listed,
      testIds: row.lab_package_items.map((item) => item.lab_test_id),
    })),
  };
}
