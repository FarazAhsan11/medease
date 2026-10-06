import { BotIcon, RotateCcwIcon } from "lucide-react";

import { IconTile } from "@/components/shared/icon-tile";
import { Button } from "@/components/ui/button";

export function ChatHeader() {
  return (
    <div className="flex items-center justify-between gap-4 border-b px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="relative">
          <IconTile icon={BotIcon} tone="solid" />
          <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-card bg-success" />
        </div>
        <div>
          <h1 className="text-sm font-semibold">CareDoc</h1>
          <p className="text-xs text-muted-foreground">
            AI medical assistant · Online
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground"
      >
        <RotateCcwIcon aria-hidden />
        New chat
      </Button>
    </div>
  );
}
