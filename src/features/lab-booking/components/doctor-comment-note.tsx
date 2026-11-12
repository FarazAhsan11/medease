import { MessageSquareTextIcon } from "lucide-react";

import type { DoctorComment } from "@/features/lab-booking/lib/lab-bookings";
import { formatDateTime } from "@/lib/datetime";

type DoctorCommentNoteProps = {
  comment: DoctorComment;
  timezone: string;
};

// What the ordering doctor said about the report (LAB-08).
export function DoctorCommentNote({
  comment,
  timezone,
}: DoctorCommentNoteProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-secondary p-4 text-sm text-secondary-foreground">
      <MessageSquareTextIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="grid min-w-0 gap-1">
        <p className="font-medium">
          {comment.doctorName}&apos;s comment
          <span className="font-normal opacity-80">
            {" "}
            · {formatDateTime(comment.commentedAt, timezone)}
          </span>
        </p>
        <p className="break-words whitespace-pre-line">{comment.comment}</p>
      </div>
    </div>
  );
}
