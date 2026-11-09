import type { NextRequest } from "next/server";

import { openLabReport } from "@/features/lab-reports/lib/open-lab-report.server";
import { requireRole } from "@/lib/auth/session";

// Opens one of the patient's lab reports (see openLabReport).
export async function GET(
  _request: NextRequest,
  context: RouteContext<"/patient/lab-tests/reports/[id]">,
) {
  await requireRole("patient");
  return openLabReport((await context.params).id);
}
