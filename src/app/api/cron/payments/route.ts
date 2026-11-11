import { NextResponse } from "next/server";

import {
  reconcilePayments,
  sendDueRefunds,
} from "@/features/payments/lib/process-payments.server";
import { isCronAuthorized } from "@/lib/cron-auth.server";

// Called every 5 minutes by the Supabase cron job `payments`: sends refunds
// that are due and asks the provider about payments whose webhook may have
// been lost (docs/payments.md). Answers with counts only. The 502 is what
// shows a failure in net._http_response.
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const [refunds, reconciled] = await Promise.all([
      sendDueRefunds(),
      reconcilePayments(),
    ]);
    return NextResponse.json(
      { refunds, reconciled },
      { status: refunds.sent < refunds.claimed ? 502 : 200 },
    );
  } catch (cause) {
    console.error(
      "The payments run failed:",
      cause instanceof Error ? cause.message : "unknown",
    );
    return NextResponse.json({ error: "run_failed" }, { status: 500 });
  }
}
