import { ArrowUpIcon } from "lucide-react";

import { EmergencyNotice } from "@/components/shared/emergency-notice";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ChatComposer() {
  return (
    <div className="border-t p-4">
      <form className="flex items-end gap-2 rounded-2xl border bg-background p-2 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
        <Textarea
          rows={1}
          aria-label="Describe your symptoms"
          placeholder="Describe your symptoms…"
          className="max-h-40 min-h-9 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button type="button" size="icon" aria-label="Send message" disabled>
          <ArrowUpIcon />
        </Button>
      </form>
      <EmergencyNotice className="mt-2 justify-center text-muted-foreground" />
    </div>
  );
}
