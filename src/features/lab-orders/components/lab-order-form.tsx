"use client";

import { EyeIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";

import { CheckboxListPicker } from "@/components/shared/checkbox-list-picker";
import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { SelectableChip } from "@/components/shared/selectable-chip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveLabOrder } from "@/features/lab-orders/actions/save-lab-order";
import {
  LAB_ORDER_PRIORITIES,
  MAX_ORDER_NOTE,
  MAX_ORDER_TESTS,
  priorityHints,
  priorityLabels,
  type LabOrder,
  type LabOrderPriority,
  type LabOrderTest,
} from "@/features/lab-orders/lib/lab-orders";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type LabOrderFormProps = {
  appointmentId: string;
  // The shared list of tests labs price.
  tests: LabOrderTest[];
  order: LabOrder | null;
  // Tests a booking holds (LAB-08): they stay on the order.
  bookedTestIds: string[];
};

export function LabOrderForm({
  appointmentId,
  tests,
  order,
  bookedTestIds,
}: LabOrderFormProps) {
  const active = order?.status === "active" ? order : null;
  const [selected, setSelected] = useState(
    () => active?.tests.map((test) => test.id) ?? [],
  );
  const [priority, setPriority] = useState<LabOrderPriority>(
    active?.priority ?? "routine",
  );
  const { pending, onSubmit, fieldError } = useFormAction(
    saveLabOrder,
    initialFormState,
  );
  const tooMany = selected.length > MAX_ORDER_TESTS;

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      className="grid min-w-0 gap-5"
      noValidate
    >
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="priority" value={priority} />
      {selected.map((id) => (
        <input key={id} type="hidden" name="testIds" value={id} />
      ))}

      <CheckboxListPicker
        id="lab-order-tests"
        legend="Tests"
        filterLabel="Search tests"
        items={tests.map((test) => {
          const booked = bookedTestIds.includes(test.id);
          return {
            key: test.id,
            label: test.name,
            detail: booked ? "Booked by the patient" : undefined,
            disabled: booked,
          };
        })}
        selected={selected}
        onToggle={(id, checked) =>
          setSelected((current) =>
            checked
              ? [...current, id]
              : current.filter((value) => value !== id),
          )
        }
        error={
          fieldError("testIds") ??
          (tooMany ? `Order at most ${MAX_ORDER_TESTS} tests.` : undefined)
        }
      />

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Priority</legend>
        <div className="flex flex-wrap gap-2">
          {LAB_ORDER_PRIORITIES.map((value) => (
            <SelectableChip
              key={value}
              active={priority === value}
              onSelect={() => setPriority(value)}
              className="px-4 py-2 text-left"
            >
              <span className="block font-medium">{priorityLabels[value]}</span>
              <span className="block text-xs opacity-80">
                {priorityHints[value]}
              </span>
            </SelectableChip>
          ))}
        </div>
      </fieldset>

      <FormField
        id="lab-order-note"
        label="Note for the patient (optional)"
        hint="For example: fasting sample, or repeat in 3 months. A test that isn't on the list can go here too."
        error={fieldError("note")}
      >
        <Textarea
          id="lab-order-note"
          name="note"
          rows={3}
          maxLength={MAX_ORDER_NOTE}
          defaultValue={active?.note ?? ""}
          {...fieldErrorProps("lab-order-note", fieldError("note"))}
        />
      </FormField>

      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <EyeIcon className="size-3" aria-hidden />
        The patient sees these tests in the app and can book them at any lab.
      </p>
      <Button
        type="submit"
        disabled={pending || selected.length === 0 || tooMany}
        className="w-fit gap-1.5"
      >
        {pending && <Loader2Icon className="animate-spin" aria-hidden />}
        {pending ? "Saving…" : active ? "Update lab tests" : "Order lab tests"}
      </Button>
    </form>
  );
}
