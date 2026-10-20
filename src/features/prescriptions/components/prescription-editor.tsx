"use client";

import { PencilIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { PrescriptionForm } from "@/features/prescriptions/components/prescription-form";
import type { Prescription } from "@/features/prescriptions/lib/prescriptions";

type PrescriptionEditorProps = {
  prescription: Prescription;
  canEdit: boolean;
  // Other actions next to Edit (print, cancel).
  actions: ReactNode;
  // The issued prescription, shown when not editing.
  children: ReactNode;
};

// Shows the active prescription, or the form to replace it with a new version.
export function PrescriptionEditor({
  prescription,
  canEdit,
  actions,
  children,
}: PrescriptionEditorProps) {
  const [editing, setEditing] = useState(false);

  if (editing && canEdit) {
    return (
      <PrescriptionForm
        appointmentId={prescription.appointmentId}
        existing={prescription}
        onDone={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2 print:hidden">
        {canEdit && (
          <Button
            type="button"
            size="sm"
            onClick={() => setEditing(true)}
            className="gap-1.5"
          >
            <PencilIcon aria-hidden />
            Edit
          </Button>
        )}
        {actions}
      </div>
      {children}
    </div>
  );
}
