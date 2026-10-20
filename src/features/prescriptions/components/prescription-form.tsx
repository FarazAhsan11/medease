"use client";

import { Loader2Icon, PlusIcon } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { issuePrescription } from "@/features/prescriptions/actions/issue-prescription";
import {
  MedicineRowFields,
  type MedicineDraft,
} from "@/features/prescriptions/components/medicine-row-fields";
import {
  MAX_PRESCRIPTION_ITEMS,
  type Prescription,
} from "@/features/prescriptions/lib/prescriptions";
import { prescriptionItemsSchema } from "@/features/prescriptions/schemas/prescription";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type PrescriptionFormProps = {
  appointmentId: string;
  // The active version when editing; null for a new prescription.
  existing: Prescription | null;
  onDone?: () => void;
};

const emptyRow = (key: string): MedicineDraft => ({
  key,
  medicine: "",
  strength: "",
  form: "tablet",
  dose: "",
  frequency: "daily",
  doseTimes: [],
  meal: "any",
  durationDays: "",
  instructions: "",
});

// Row keys are "<form id>-<n>", the same on the server and the client.
function rowsFrom(
  existing: Prescription | null,
  keyPrefix: string,
): MedicineDraft[] {
  if (!existing) return [emptyRow(`${keyPrefix}-0`)];
  return existing.items.map((item, index) => ({
    key: `${keyPrefix}-${index}`,
    medicine: item.medicine,
    strength: item.strength ?? "",
    form: item.form,
    dose: item.dose,
    frequency: item.frequency,
    doseTimes: item.doseTimes,
    meal: item.meal,
    durationDays: item.durationDays === null ? "" : String(item.durationDays),
    instructions: item.instructions ?? "",
  }));
}

const toPayload = (row: MedicineDraft) => ({
  medicine: row.medicine,
  strength: row.strength,
  form: row.form,
  dose: row.dose,
  frequency: row.frequency,
  doseTimes: row.doseTimes,
  meal: row.meal,
  durationDays:
    row.durationDays.trim() === "" ? null : Number(row.durationDays),
  instructions: row.instructions,
});

export function PrescriptionForm({
  appointmentId,
  existing,
  onDone,
}: PrescriptionFormProps) {
  const keyPrefix = useId();
  const [initial] = useState(() => ({
    rows: rowsFrom(existing, keyPrefix),
    diagnosis: existing?.diagnosis ?? "",
    advice: existing?.advice ?? "",
  }));
  const [rows, setRows] = useState(initial.rows);
  const nextKey = useRef(initial.rows.length);
  const [diagnosis, setDiagnosis] = useState(initial.diagnosis);
  const [advice, setAdvice] = useState(initial.advice);
  // Errors found before sending, keyed "<row key>.<field>".
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const { pending, onSubmit, fieldError } = useFormAction(
    issuePrescription,
    initialFormState,
    { onSuccess: () => onDone?.() },
  );

  const snapshot = (value: typeof initial) =>
    JSON.stringify([
      value.rows.map(toPayload),
      value.diagnosis.trim(),
      value.advice.trim(),
    ]);
  const dirty = snapshot({ rows, diagnosis, advice }) !== snapshot(initial);

  // Warn before closing or reloading the tab with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function updateRow(key: string, patch: Partial<MedicineDraft>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
    // Clear the errors of the fields that just changed.
    setRowErrors((current) => {
      const next = { ...current };
      for (const field of Object.keys(patch)) delete next[`${key}.${field}`];
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const result = prescriptionItemsSchema.safeParse(rows.map(toPayload));
    if (!result.success) {
      event.preventDefault();
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const [index, field] = issue.path;
        const row = typeof index === "number" ? rows[index] : undefined;
        const name = row ? `${row.key}.${String(field)}` : "items";
        errors[name] ??= issue.message;
      }
      setRowErrors(errors);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setRowErrors({});
    onSubmit(event);
  }

  // Errors checked here first; the server's (by row position) as a fallback.
  const rowError = (index: number, key: string) => (field: string) =>
    rowErrors[`${key}.${field}`] ?? fieldError(`items.${index}.${field}`);
  const listError = rowErrors.items ?? fieldError("items");

  return (
    <form onSubmit={handleSubmit} className="grid gap-6" noValidate>
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="replacesId" value={existing?.id ?? ""} />
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(rows.map(toPayload))}
      />

      <FormField
        id="rx-diagnosis"
        label="Diagnosis (optional)"
        hint="The patient sees this on their prescription."
        error={fieldError("diagnosis")}
      >
        <Input
          id="rx-diagnosis"
          name="diagnosis"
          value={diagnosis}
          onChange={(event) => setDiagnosis(event.target.value)}
          maxLength={200}
          placeholder="e.g. Acute sinusitis"
          autoComplete="off"
          {...fieldErrorProps("rx-diagnosis", fieldError("diagnosis"))}
        />
      </FormField>

      <section className="grid gap-3" aria-label="Medicines">
        {rows.map((row, index) => (
          <MedicineRowFields
            key={row.key}
            number={index + 1}
            row={row}
            error={rowError(index, row.key)}
            onChange={(patch) => updateRow(row.key, patch)}
            onRemove={
              rows.length > 1
                ? () =>
                    setRows((current) =>
                      current.filter((item) => item.key !== row.key),
                    )
                : undefined
            }
          />
        ))}
        {listError && <p className="text-xs text-destructive">{listError}</p>}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={rows.length >= MAX_PRESCRIPTION_ITEMS}
          onClick={() => {
            const row = emptyRow(`${keyPrefix}-${nextKey.current++}`);
            setRows((current) => [...current, row]);
          }}
          className="w-fit gap-1.5"
        >
          <PlusIcon aria-hidden />
          Add medicine
        </Button>
        {rows.length >= MAX_PRESCRIPTION_ITEMS && (
          <p className="text-xs text-muted-foreground">
            A prescription can have up to {MAX_PRESCRIPTION_ITEMS} medicines.
          </p>
        )}
      </section>

      <FormField
        id="rx-advice"
        label="Advice for the patient (optional)"
        hint="Rest, diet, warning signs, when to follow up."
        error={fieldError("advice")}
      >
        <Textarea
          id="rx-advice"
          name="advice"
          rows={4}
          value={advice}
          onChange={(event) => setAdvice(event.target.value)}
          maxLength={1000}
          placeholder="e.g. Drink plenty of fluids. Come back if the fever lasts more than 3 days."
          {...fieldErrorProps("rx-advice", fieldError("advice"))}
        />
      </FormField>

      <div className="grid gap-2 border-t pt-5">
        <p className="text-xs text-muted-foreground">
          {existing
            ? "Saving issues a new version and emails the patient. The current version stops applying."
            : "The patient sees it right away and gets an email."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending} className="gap-1.5">
            {pending && <Loader2Icon className="animate-spin" aria-hidden />}
            {pending
              ? "Saving…"
              : existing
                ? "Save new version"
                : "Issue prescription"}
          </Button>
          {existing && onDone && (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={onDone}
            >
              Discard changes
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
