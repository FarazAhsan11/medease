import "server-only";

import { cache } from "react";

import { getCollectionAreas } from "@/features/home-collection/data/home-collection";
import type { LabCollectionAreas } from "@/features/home-collection/lib/home-collection";
import { labTestCategories } from "@/features/lab-catalog/lib/lab-catalog";
import {
  isPastLastPage,
  likePattern,
  pageCount,
  pageParam,
  pageRange,
  searchParam,
} from "@/lib/directory-search";
import { createClient } from "@/lib/supabase/server";

// What patients and guests browse (LAB-02). Everything reads through the
// public views, which show only listed items from verified labs.

export const LAB_TESTS_PER_PAGE = 12;
export const PACKAGES_CATEGORY = "packages";

export type LabTestSearch = {
  q: string;
  // A test category, "packages", or "" for every test.
  category: string;
  page: number;
};

export type CatalogTest = {
  id: string;
  name: string;
  category: string;
  sampleType: string;
  description: string;
  labCount: number;
  lowestPrice: number;
  fastestHours: number;
  homeCollection: boolean;
};

export type PackageOffer = {
  id: string;
  labName: string;
  labAddress: string;
  name: string;
  description: string | null;
  price: number;
  separatePrice: number;
  turnaroundHours: number;
  // Where the lab collects at home, or null when it can't for every test in it.
  homeCollection: LabCollectionAreas | null;
  testNames: string[];
};

export type LabTestDetails = {
  id: string;
  name: string;
  category: string;
  sampleType: string;
  description: string;
  preparation: string;
};

export type LabTestOffer = {
  id: string;
  labId: string;
  labName: string;
  labAddress: string;
  price: number;
  turnaroundHours: number;
  // Where the lab collects at home, or null when it doesn't for this test.
  homeCollection: LabCollectionAreas | null;
  preparation: string;
};

const knownCategories = new Set<string>([
  ...labTestCategories,
  PACKAGES_CATEGORY,
]);

export function parseLabTestSearch(
  params: Record<string, string | string[] | undefined>,
): LabTestSearch {
  const category = searchParam(params.category);
  return {
    q: searchParam(params.q),
    category: knownCategories.has(category) ? category : "",
    page: pageParam(params.page),
  };
}

type CatalogRow = {
  id: string;
  name: string;
  category: string;
  sample_type: string;
  description: string;
  lab_count: number;
  lowest_price: number;
  fastest_hours: number;
  home_collection: boolean;
};

export async function searchLabTests(search: LabTestSearch) {
  const supabase = await createClient();
  const pattern = likePattern(search.q);
  const fetchPage = (page: number) => {
    let query = supabase
      .from("lab_test_catalog")
      .select(
        "id, name, category, sample_type, description, lab_count, lowest_price, fastest_hours, home_collection",
        { count: "exact" },
      );
    if (search.category) query = query.eq("category", search.category);
    if (pattern) query = query.ilike("search_text", pattern);
    return query
      .order("name")
      .range(...pageRange(page, LAB_TESTS_PER_PAGE))
      .returns<CatalogRow[]>();
  };

  let page = search.page;
  let result = await fetchPage(page);
  if (page > 1 && isPastLastPage(result.error)) {
    page = 1;
    result = await fetchPage(page);
  }
  const { data, count, error } = result;
  if (error) throw new Error(`lab_test_catalog: ${error.message}`);

  const total = count ?? 0;
  return {
    page,
    tests: data.map((row): CatalogTest => ({
      id: row.id,
      name: row.name,
      category: row.category,
      sampleType: row.sample_type,
      description: row.description,
      labCount: row.lab_count,
      lowestPrice: row.lowest_price,
      fastestHours: row.fastest_hours,
      homeCollection: row.home_collection,
    })),
    total,
    totalPages: pageCount(total, LAB_TESTS_PER_PAGE),
  };
}

type PackageRow = {
  id: string;
  lab_id: string;
  lab_name: string;
  lab_address: string;
  name: string;
  description: string | null;
  price: number;
  separate_price: number;
  turnaround_hours: number;
  home_collection: boolean;
  test_names: string[];
};

// Where the labs in a list collect at home, in one query for the whole list.
// A lab with home collection on always has a city; a lab missing from the map
// (a city removed between the two queries) shows no home collection.
const collectionAreasFor = (
  rows: { lab_id: string; home_collection: boolean }[],
) =>
  getCollectionAreas([
    ...new Set(
      rows.filter((row) => row.home_collection).map((row) => row.lab_id),
    ),
  ]);

export async function searchLabPackages(search: LabTestSearch) {
  const supabase = await createClient();
  const pattern = likePattern(search.q);
  const fetchPage = (page: number) => {
    let query = supabase
      .from("lab_package_offers")
      .select(
        "id, lab_id, lab_name, lab_address, name, description, price, separate_price, turnaround_hours, home_collection, test_names",
        { count: "exact" },
      );
    if (pattern) query = query.ilike("search_text", pattern);
    return query
      .order("price")
      .order("id")
      .range(...pageRange(page, LAB_TESTS_PER_PAGE))
      .returns<PackageRow[]>();
  };

  let page = search.page;
  let result = await fetchPage(page);
  if (page > 1 && isPastLastPage(result.error)) {
    page = 1;
    result = await fetchPage(page);
  }
  const { data, count, error } = result;
  if (error) throw new Error(`lab_package_offers: ${error.message}`);
  const collection = await collectionAreasFor(data);

  const total = count ?? 0;
  return {
    page,
    packages: data.map((row): PackageOffer => ({
      id: row.id,
      labName: row.lab_name,
      labAddress: row.lab_address,
      name: row.name,
      description: row.description,
      price: row.price,
      separatePrice: row.separate_price,
      turnaroundHours: row.turnaround_hours,
      homeCollection: row.home_collection
        ? (collection.get(row.lab_id) ?? null)
        : null,
      testNames: row.test_names,
    })),
    total,
    totalPages: pageCount(total, LAB_TESTS_PER_PAGE),
  };
}

const TEST_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const isLabTestId = (id: string) => id.length <= 40 && TEST_ID.test(id);

// Cached per request: the page and its metadata both need it.
export const getLabTestDetails = cache(
  async (id: string): Promise<LabTestDetails | null> => {
    if (!isLabTestId(id)) return null;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lab_test_types")
      .select("id, name, category, sample_type, description, preparation")
      .eq("id", id)
      .maybeSingle<{
        id: string;
        name: string;
        category: string;
        sample_type: string;
        description: string;
        preparation: string;
      }>();

    if (error) throw new Error(`lab_test_types: ${error.message}`);
    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      category: data.category,
      sampleType: data.sample_type,
      description: data.description,
      preparation: data.preparation,
    };
  },
);

// The verified labs offering one test, cheapest first, and how many there are
// in all: a test offered by more labs than this shows only the cheapest.
export const MAX_OFFERS = 100;

export type LabTestOffers = { offers: LabTestOffer[]; total: number };

export async function getLabTestOffers(
  testTypeId: string,
): Promise<LabTestOffers> {
  if (!isLabTestId(testTypeId)) return { offers: [], total: 0 };

  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from("lab_test_offers")
    .select(
      "id, lab_id, lab_name, lab_address, price, turnaround_hours, home_collection, preparation",
      { count: "exact" },
    )
    .eq("test_type_id", testTypeId)
    .order("price")
    .order("turnaround_hours")
    .limit(MAX_OFFERS)
    .returns<
      {
        id: string;
        lab_id: string;
        lab_name: string;
        lab_address: string;
        price: number;
        turnaround_hours: number;
        home_collection: boolean;
        preparation: string;
      }[]
    >();

  if (error) throw new Error(`lab_test_offers: ${error.message}`);

  const collection = await collectionAreasFor(data);

  return {
    offers: data.map((row) => ({
      id: row.id,
      labId: row.lab_id,
      labName: row.lab_name,
      labAddress: row.lab_address,
      price: row.price,
      turnaroundHours: row.turnaround_hours,
      homeCollection: row.home_collection
        ? (collection.get(row.lab_id) ?? null)
        : null,
      preparation: row.preparation,
    })),
    total: count ?? data.length,
  };
}
