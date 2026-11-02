import { NextResponse } from "next/server";

import { patientRoutes, unsubscribeRoute } from "@/config/routes";
import { medicineReminderEmail } from "@/features/medicine-reminders/emails/medicine-reminder-email";
import type { DoseTime } from "@/features/prescriptions/lib/prescriptions";
import { isCronAuthorized } from "@/lib/cron-auth.server";
import { getSiteUrl } from "@/lib/env.server";
import { sendMail } from "@/lib/mailer.server";
import { createAdminClient } from "@/lib/supabase/admin";

type DueReminder = {
  patient_id: string;
  local_date: string;
  dose_time: DoseTime;
  patient_name: string;
  patient_email: string;
  unsubscribe_token: string;
};

// An email that went out but can't be marked counts as failed: it's sent again,
// which beats losing a reminder.
async function sendReminder(
  admin: ReturnType<typeof createAdminClient>,
  reminder: DueReminder,
  site: string,
) {
  const unsubscribe = new URL(unsubscribeRoute, site);
  unsubscribe.searchParams.set("token", reminder.unsubscribe_token);

  await sendMail({
    to: reminder.patient_email,
    ...medicineReminderEmail(reminder, {
      medicines: new URL(patientRoutes.prescriptions, site).toString(),
      unsubscribe: unsubscribe.toString(),
    }),
  });

  const { error } = await admin.rpc("mark_medicine_reminder_emailed", {
    p_patient_id: reminder.patient_id,
    p_local_date: reminder.local_date,
    p_dose_time: reminder.dose_time,
  });
  if (error) {
    console.error("Marking a medicine reminder as sent failed:", error.code);
    throw error;
  }
}

// Called every 15 minutes by the Supabase cron job `medicine-reminders`. Everything
// about what's due and who has been told is decided in the database. This reads only
// the claimed reminders and answers with counts, never who they were for. The 502 is
// what shows a failed send in net._http_response.
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_medicine_reminders");
  if (error) {
    console.error("Claiming medicine reminders failed:", error.code);
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  }

  const reminders = (data ?? []) as DueReminder[];
  const site = getSiteUrl();
  const results = await Promise.allSettled(
    reminders.map((reminder) => sendReminder(admin, reminder, site)),
  );
  const emailed = results.filter(
    (result) => result.status === "fulfilled",
  ).length;

  return NextResponse.json(
    { claimed: reminders.length, emailed },
    { status: emailed < reminders.length ? 502 : 200 },
  );
}
