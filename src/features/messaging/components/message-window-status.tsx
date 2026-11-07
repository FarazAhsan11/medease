import { CalendarPlusIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { patientRoutes } from "@/config/routes";
import { MessageWindowControls } from "@/features/messaging/components/message-window-controls";
import {
  MESSAGE_WINDOW_DAYS,
  type Conversation,
  type MessagingRole,
} from "@/features/messaging/lib/messaging";
import { CLINIC_TIMEZONE, formatDateTime } from "@/lib/datetime";

type MessageWindowStatusProps = {
  conversation: Conversation;
  role: MessagingRole;
};

function until(endsAt: string) {
  return formatDateTime(endsAt, CLINIC_TIMEZONE);
}

// MSG-04. The doctor sees and changes how long the patient can write; the
// patient sees until when they can, and once it closes, a way to book.
export function MessageWindowStatus({
  conversation,
  role,
}: MessageWindowStatusProps) {
  const {
    id,
    doctorId,
    patientWindowEndsAt,
    patientCanWrite,
    canWrite,
    otherName,
  } = conversation;

  if (role === "doctor") {
    if (!canWrite) {
      return (
        <p className="border-t px-5 py-4 text-sm text-muted-foreground">
          Every booking with this patient was cancelled, so messaging is closed.
        </p>
      );
    }

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-5 py-2.5">
        <p className="text-xs text-muted-foreground">
          {patientCanWrite && patientWindowEndsAt
            ? `${otherName} can write until ${until(patientWindowEndsAt)}.`
            : `${otherName} can't write until their next booking. You still can.`}
        </p>
        <MessageWindowControls conversationId={id} open={patientCanWrite} />
      </div>
    );
  }

  if (!canWrite) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
        <p className="max-w-md text-sm text-muted-foreground">
          You can message a doctor for {MESSAGE_WINDOW_DAYS} days after a visit.
          To ask something new, book another visit.
        </p>
        <Link
          href={patientRoutes.bookDoctor(doctorId)}
          className={buttonVariants({ size: "sm", className: "gap-1.5" })}
        >
          <CalendarPlusIcon aria-hidden />
          Book a visit
        </Link>
      </div>
    );
  }

  return patientWindowEndsAt ? (
    <p className="border-b bg-muted/40 px-5 py-2.5 text-xs text-muted-foreground">
      You can write until {until(patientWindowEndsAt)}. Your doctor replies when
      they can.
    </p>
  ) : null;
}
