"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";

type RecoveryCodesPanelProps = {
  codes: string[];
  continueHref?: string;
};

export function RecoveryCodesPanel({
  codes,
  continueHref,
}: RecoveryCodesPanelProps) {
  const [copied, setCopied] = useState(false);

  async function copyCodes() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
    } catch {
      toast.error("We couldn't copy them. Please write them down.");
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <h3 className="text-sm font-semibold">Save your recovery codes</h3>
        <p className="text-sm text-muted-foreground">
          If you lose your phone, each code gets you back in once. Keep them
          somewhere safe. They won&apos;t be shown again.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-2 rounded-xl border bg-muted p-4 font-mono text-sm min-[420px]:grid-cols-2">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={copyCodes}
          className="gap-2"
        >
          {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
          {copied ? "Copied" : "Copy codes"}
        </Button>
        {continueHref && (
          <Link href={continueHref} className={buttonVariants()}>
            I&apos;ve saved them
          </Link>
        )}
      </div>
    </div>
  );
}
