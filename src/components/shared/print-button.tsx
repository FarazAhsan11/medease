"use client";

import { PrinterIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      className="gap-1.5 print:hidden"
    >
      <PrinterIcon aria-hidden />
      Print
    </Button>
  );
}
