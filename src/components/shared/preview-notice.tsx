import { ConstructionIcon } from "lucide-react";

// SUP-07. Marks a screen that shows sample data, so nobody mistakes it for a real
// order, record or result.
type PreviewNoticeProps = {
  feature: string;
  // For a page that is only partly sample data, say which part.
  detail?: string;
};

export function PreviewNotice({
  feature,
  detail = "What you see here is sample information, and nothing you do on this page is saved or sent.",
}: PreviewNoticeProps) {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
      <ConstructionIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        {feature} is coming soon. {detail}
      </span>
    </p>
  );
}
