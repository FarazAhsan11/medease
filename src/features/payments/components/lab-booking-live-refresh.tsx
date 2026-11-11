"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { subscribeToUserChannel } from "@/features/messaging/lib/user-channel";

type LabBookingLiveRefreshProps = {
  userId: string;
  bookingId: string;
};

// Reloads the page's data when this booking's payment or status changes, as
// the database announces it on the patient's channel; also once the channel
// is joined or rejoined, since a change sent before then was missed. Never
// polls.
export function LabBookingLiveRefresh({
  userId,
  bookingId,
}: LabBookingLiveRefreshProps) {
  const router = useRouter();

  useEffect(
    () =>
      subscribeToUserChannel(userId, {
        onLabBooking: (change) => {
          if (change.id === bookingId) router.refresh();
        },
        onLive: () => router.refresh(),
      }),
    [userId, bookingId, router],
  );

  return null;
}
