import "server-only";

import { cache } from "react";

import type { DashboardRole } from "@/config/dashboards";
import { createClient } from "@/lib/supabase/server";

import {
  requiredConsents,
  TELEMEDICINE_CONSENT,
} from "../lib/consent-documents";
import { getPendingDocuments, type ConsentRow } from "../lib/consent-versions";

// Cached because requireRole runs in layouts and pages alike. A failed read
// throws: unlike the second factor, nothing further down would ask again.
const getConsentRows = cache(async (): Promise<ConsentRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_consents")
    .select("document, version, withdrawn_at")
    .order("id", { ascending: false });

  if (error) throw new Error(`user_consents: ${error.code}`);

  return data;
});

export async function getPendingConsents(role: DashboardRole) {
  if (requiredConsents[role].length === 0) return [];

  return getPendingDocuments(role, await getConsentRows());
}

export async function hasTelemedicineConsent() {
  const rows = await getConsentRows();
  const latest = rows.find((row) => row.document === TELEMEDICINE_CONSENT);

  return Boolean(latest && !latest.withdrawn_at);
}
