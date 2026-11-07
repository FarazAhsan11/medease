import {
  ArrowLeftIcon,
  ClipboardListIcon,
  StethoscopeIcon,
} from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "@/components/shared/user-avatar";
import { buttonVariants } from "@/components/ui/button";
import { doctorRoutes, patientRoutes } from "@/config/routes";
import {
  messagesRoutes,
  type Conversation,
  type MessagingRole,
} from "@/features/messaging/lib/messaging";

type ConversationHeaderProps = {
  conversation: Conversation;
  role: MessagingRole;
};

export function ConversationHeader({
  conversation,
  role,
}: ConversationHeaderProps) {
  const isDoctor = role === "doctor";

  return (
    <header className="flex items-center justify-between gap-3 border-b px-3 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href={messagesRoutes[role].inbox}
          aria-label="All conversations"
          className={buttonVariants({
            variant: "ghost",
            size: "icon",
            className: "lg:hidden",
          })}
        >
          <ArrowLeftIcon aria-hidden />
        </Link>
        <UserAvatar name={conversation.otherName} className="size-9" />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">
            {conversation.otherName}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isDoctor ? "Patient" : "Doctor"}
          </p>
        </div>
      </div>
      <Link
        href={
          isDoctor
            ? doctorRoutes.patientChart(conversation.patientId)
            : patientRoutes.bookDoctor(conversation.doctorId)
        }
        className={buttonVariants({
          variant: "outline",
          size: "sm",
          className: "shrink-0 gap-1.5",
        })}
      >
        {isDoctor ? (
          <ClipboardListIcon aria-hidden />
        ) : (
          <StethoscopeIcon aria-hidden />
        )}
        {isDoctor ? "Chart" : "Book"}
      </Link>
    </header>
  );
}
