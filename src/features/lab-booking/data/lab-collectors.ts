import "server-only";

import { z } from "zod";

import { labMemberRoleSchema } from "@/features/lab-staff/lib/lab-permissions";
import type { LabCollector } from "@/features/lab-booking/lib/lab-bookings";
import { createClient } from "@/lib/supabase/server";

const rowSchema = z.object({
  user_id: z.uuid(),
  full_name: z.string().nullable(),
  role: labMemberRoleSchema,
  visits: z.record(z.string(), z.number()),
});

// The lab's people who can be sent on a home visit, collectors first, each
// with their visits still to make on the given days. Only for those who
// assign them (admin, front desk); the database refuses others.
export async function getLabCollectors(
  days: string[],
): Promise<LabCollector[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_lab_collectors", {
    p_days: days,
  });
  if (error) throw new Error(`get_lab_collectors: ${error.message}`);

  return z
    .array(rowSchema)
    .parse(data)
    .map((row) => ({
      id: row.user_id,
      name: row.full_name?.trim() || "Unnamed",
      role: row.role,
      visits: row.visits,
    }));
}
