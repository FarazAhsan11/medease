import { MessageCircleHeartIcon } from "lucide-react";

import { IconTile } from "@/components/shared/icon-tile";
import { chatSuggestions } from "@/features/chat/data/suggestions";

export function ChatEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
      <IconTile icon={MessageCircleHeartIcon} size="lg" />
      <h2 className="mt-4 text-lg font-semibold">How are you feeling today?</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Describe your symptoms and CareDoc will ask a couple of follow-up
        questions before suggesting the right specialist.
      </p>
      <div className="mt-8 grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {chatSuggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="rounded-xl border bg-background px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-secondary hover:text-secondary-foreground"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
