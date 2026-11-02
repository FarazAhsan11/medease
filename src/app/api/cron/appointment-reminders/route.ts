import { NextResponse } from "next/server";

import { patientRoutes } from "@/config/routes";
import { appointmentReminderEmail } from "@/features/appointments/emails/appointment-email-templates";
import { isCronAuthorized } from "@/lib/cron-auth.server";
import { getSiteUrl } from "@/lib/env.server";
import { sendMail } from "@/lib/mailer.server";
import { createAdminClient } from "@/lib/supabase/admin";

type DueReminder = {
  appointment_id: string;
  kind: "24h" | "1h";
  patient_name: string;
  patient_email: string;
  starts_at: string;
  timezone: string;
};

// An email that went out but can't be marked counts as failed: it's sent again,
// which beats losing a reminder.
async function sendReminder(
  admin: ReturnType<typeof createAdminClient>,
  reminder: DueReminder,
  url: string,
) {
  await sendMail({
    to: reminder.patient_email,
    ...appointmentReminderEmail(reminder, url),
  });

  const { error } = await admin.rpc("mark_appointment_reminder_emailed", {
    p_appointment_id: reminder.appointment_id,
    p_kind: reminder.kind,
  });
  if (error) {
    console.error("Marking a reminder as sent failed:", error.code);
    throw error;
  }
}

// Called every 15 minutes by the Supabase cron job `appointment-reminders`.
// Claiming happens in the database first, so overlapping runs can't remind anyone
// twice, and an email that isn't marked as sent comes back on a later run. It
// reads only the due reminders and answers with counts, never who they were for.
// The 502 is what shows a failed send in net._http_response.
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_appointment_reminders");
  if (error) {
    console.error("Claiming reminders failed:", error.code);
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  }

  const reminders = (data ?? []) as DueReminder[];
  const url = new URL(patientRoutes.appointments, getSiteUrl()).toString();
  const results = await Promise.allSettled(
    reminders.map((reminder) => sendReminder(admin, reminder, url)),
  );
  const emailed = results.filter(
    (result) => result.status === "fulfilled",
  ).length;

  return NextResponse.json(
    { claimed: reminders.length, emailed },
    { status: emailed < reminders.length ? 502 : 200 },
  );
}
