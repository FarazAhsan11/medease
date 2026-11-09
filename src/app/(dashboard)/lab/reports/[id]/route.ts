import type { NextRequest } from "next/server";

import { openLabReport } from "@/features/lab-reports/lib/open-lab-report.server";
import { requireRole } from "@/lib/auth/session";

// Opens a report the lab published (see openLabReport).
export async function GET(
  _request: NextRequest,
  context: RouteContext<"/lab/reports/[id]">,
) {
  await requireRole("lab");
  return openLabReport((await context.params).id);
}
