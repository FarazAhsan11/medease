import { MessageSquareIcon } from "lucide-react";

import { IconTile } from "@/components/shared/icon-tile";

// On a phone the list fills the screen, so this only shows on wider ones.
// The inbox hides its column there.
export default function DoctorMessagesPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <IconTile icon={MessageSquareIcon} size="lg" />
      <p className="max-w-xs text-sm text-muted-foreground">
        Pick a conversation, or message a patient from their chart.
      </p>
    </div>
  );
}
