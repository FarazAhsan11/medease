import "server-only";

import { cache } from "react";

import {
  ADDRESS_COLUMNS,
  toPatientAddress,
  type PatientAddressRow,
} from "@/features/addresses/lib/addresses";
import { createClient } from "@/lib/supabase/server";

// The signed-in patient's saved addresses, default first, then oldest first.
// Row level security limits rows to their own account.
export const getPatientAddresses = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patient_addresses")
    .select(ADDRESS_COLUMNS)
    .eq("account_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .returns<PatientAddressRow[]>();

  if (error) throw new Error(`patient_addresses: ${error.message}`);
  return data.map(toPatientAddress);
});
