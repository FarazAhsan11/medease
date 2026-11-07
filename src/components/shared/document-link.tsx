import { FileTextIcon } from "lucide-react";

// A short-lived signed link to a submitted file, or "Missing".
export function DocumentLink({ url }: { url: string | null }) {
  if (!url) return <span className="text-destructive">Missing</span>;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-primary hover:underline"
    >
      <FileTextIcon className="size-3.5" aria-hidden />
      View file
    </a>
  );
}
