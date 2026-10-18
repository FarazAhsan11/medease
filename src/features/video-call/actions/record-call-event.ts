"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const eventSchema = z.object({
  appointmentId: z.uuid(),
  event: z.enum(["started", "ended"]),
});

// Best effort: a failure here never interrupts the call. The database checks
// the caller is in this appointment and the call window is open.
export async function recordCallEvent(
  appointmentId: string,
  event: "started" | "ended",
) {
  const parsed = eventSchema.safeParse({ appointmentId, event });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_call_event", {
    p_appointment_id: parsed.data.appointmentId,
    p_event: parsed.data.event,
  });
  if (error) console.error("Recording call event failed:", error.message);
}
