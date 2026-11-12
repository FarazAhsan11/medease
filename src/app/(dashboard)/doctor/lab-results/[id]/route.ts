import type { NextRequest } from "next/server";

import { openLabReport } from "@/features/lab-reports/lib/open-lab-report.server";
import { requireRole } from "@/lib/auth/session";

// Opens a report from tests the doctor ordered (see openLabReport).
export async function GET(
  _request: NextRequest,
  context: RouteContext<"/doctor/lab-results/[id]">,
) {
  await requireRole("doctor");
  return openLabReport((await context.params).id);
}
