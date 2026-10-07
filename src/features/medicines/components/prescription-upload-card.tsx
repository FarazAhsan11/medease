import { FileUpIcon } from "lucide-react";

import { IconTile } from "@/components/shared/icon-tile";

export function PrescriptionUploadCard() {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-3">
        <IconTile icon={FileUpIcon} />
        <div>
          <h2 className="text-sm font-semibold">Have a prescription?</h2>
          <p className="text-xs text-muted-foreground">
            Upload it and our pharmacist will prepare your order.
          </p>
        </div>
      </div>
      <label
        htmlFor="prescription-file"
        className="mt-4 flex cursor-pointer flex-col items-center rounded-xl border border-dashed bg-background px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-secondary/50"
      >
        <span className="text-sm font-medium text-primary">
          Click to upload
        </span>
        <span className="mt-0.5 text-xs text-muted-foreground">
          JPG, PNG or PDF, up to 5 MB
        </span>
        <input
          id="prescription-file"
          type="file"
          accept="image/*,application/pdf"
          className="sr-only"
        />
      </label>
    </div>
  );
}
