import "server-only";

import { z } from "zod";

import { historyRowSchema } from "@/features/lab-samples/lib/samples";
import { createClient } from "@/lib/supabase/server";

// Every step of one booking and who took it, oldest first; null when the
// caller can't see the booking. The database checks the role and the booking.
export async function getLabBookingHistory(bookingId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_lab_booking_history", {
    p_booking_id: bookingId,
  });
  if (error?.message === "booking_not_found") return null;
  if (error) throw new Error(`get_lab_booking_history: ${error.message}`);
  return z.array(historyRowSchema).parse(data);
}
