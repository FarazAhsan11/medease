import "server-only";

import { cache } from "react";

import {
  FAMILY_MEMBER_COLUMNS,
  toFamilyMember,
  type FamilyMemberRow,
} from "@/features/family/lib/family-members";
import { createClient } from "@/lib/supabase/server";

// The signed-in patient's family members, oldest entry first. Row level
// security limits rows to their own account.
export const getFamilyMembers = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("care_recipients")
    .select(FAMILY_MEMBER_COLUMNS)
    .eq("account_id", userId)
    .neq("relation", "self")
    .order("created_at", { ascending: true })
    .returns<FamilyMemberRow[]>();

  if (error) throw new Error(`care_recipients: ${error.message}`);
  return data.map(toFamilyMember);
});
