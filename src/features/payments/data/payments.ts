import "server-only";

import type { PaymentAttemptStatus } from "@/features/payments/lib/payments";
import { createClient } from "@/lib/supabase/server";

// The newest payment attempt for one of the patient's bookings, or null.
// Row level security keeps it to the patient's own; the filter and order
// follow payments_booking_idx.
export async function getLatestLabPayment(bookingId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("status, created_at")
    .eq("lab_booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ status: PaymentAttemptStatus; created_at: string }>();

  if (error) throw new Error(`payments: ${error.message}`);
  return data;
}
