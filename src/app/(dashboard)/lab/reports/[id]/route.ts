import type { NextRequest } from "next/server";

import { openLabReport } from "@/features/lab-reports/lib/open-lab-report.server";
import { requireLabMember } from "@/features/lab-staff/lib/lab-member.server";

// Opens a report the lab published (see openLabReport).
export async function GET(
  _request: NextRequest,
  context: RouteContext<"/lab/reports/[id]">,
) {
  await requireLabMember("reports.view");
  return openLabReport((await context.params).id);
}
