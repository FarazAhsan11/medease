import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { patientRoutes } from "@/config/routes";
import { appointmentReminderEmail } from "@/features/appointments/emails/appointment-email-templates";
import { getCronSecret, getSiteUrl } from "@/lib/env.server";
import { sendMail } from "@/lib/mailer.server";
import { createAdminClient } from "@/lib/supabase/admin";

type DueReminder = {
  kind: "24h" | "1h";
  patient_name: string;
  patient_email: string;
  starts_at: string;
  timezone: string;
};

function isAuthorized(request: Request) {
  const secret = getCronSecret();
  if (!secret) return false;

  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);

  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Called every 15 minutes by .github/workflows/reminders.yml. Claiming happens in
// the database first, so running this twice can't remind anyone twice. It reads
// only the due reminders and answers with counts, never who they were for.
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await createAdminClient().rpc(
    "claim_appointment_reminders",
  );
  if (error) {
    console.error("Claiming reminders failed:", error.code);
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  }

  const reminders = (data ?? []) as DueReminder[];
  const url = new URL(patientRoutes.appointments, getSiteUrl()).toString();
  const results = await Promise.allSettled(
    reminders.map((reminder) =>
      sendMail({
        to: reminder.patient_email,
        ...appointmentReminderEmail(reminder, url),
      }),
    ),
  );

  return NextResponse.json({
    claimed: reminders.length,
    emailed: results.filter((result) => result.status === "fulfilled").length,
  });
}
