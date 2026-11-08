"use client";

import { Loader2Icon, PencilIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { SettingRow } from "@/components/shared/setting-row";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { saveLabPackage } from "@/features/lab-catalog/actions/save-lab-package";
import type {
  LabCatalogPackage,
  LabCatalogTest,
} from "@/features/lab-catalog/data/lab-catalog";
import {
  PACKAGE_TESTS,
  packageSavings,
} from "@/features/lab-catalog/lib/lab-catalog";
import { useFormAction } from "@/hooks/use-form-action";
import { formatFee } from "@/lib/format";
import { initialFormState } from "@/lib/form-state";

const id = (field: string) => `lab-package-${field}`;

type LabPackageSheetProps = {
  // Every test in the lab's catalog.
  tests: LabCatalogTest[];
  // Edits this package; without it the sheet adds a new one.
  labPackage?: LabCatalogPackage;
  disabled?: boolean;
};

export function LabPackageSheet({
  tests,
  labPackage,
  disabled,
}: LabPackageSheetProps) {
  const [open, setOpen] = useState(false);
  // The values the form opened with. Saving refreshes `labPackage` while the
  // sheet is still closing, and a form field's default can't change once set.
  const [saved, setSaved] = useState(labPackage);
  const [selected, setSelected] = useState<string[]>(labPackage?.testIds ?? []);
  const [price, setPrice] = useState(
    labPackage ? String(labPackage.price) : "",
  );
  const { pending, onSubmit, fieldError } = useFormAction(
    saveLabPackage,
    initialFormState,
    { onSuccess: () => setOpen(false) },
  );

  // Opening starts from what's saved, so an edit closed unsaved is dropped.
  const onOpenChange = (next: boolean) => {
    if (next) {
      setSaved(labPackage);
      setSelected(labPackage?.testIds ?? []);
      setPrice(labPackage ? String(labPackage.price) : "");
    }
    setOpen(next);
  };

  const separatePrice = tests
    .filter((test) => selected.includes(test.id))
    .reduce((sum, test) => sum + test.price, 0);
  const savings = packageSavings(Number(price) || 0, separatePrice);
  const toggle = (testId: string, checked: boolean) =>
    setSelected((current) =>
      checked
        ? [...current, testId]
        : current.filter((value) => value !== testId),
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {labPackage ? (
        <SheetTrigger
          render={
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground"
              aria-label={`Edit ${labPackage.name}`}
            />
          }
        >
          <PencilIcon />
        </SheetTrigger>
      ) : (
        <SheetTrigger
          disabled={disabled}
          render={<Button size="sm" variant="outline" className="gap-1.5" />}
        >
          <PlusIcon aria-hidden />
          Add package
        </SheetTrigger>
      )}
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle>
            {labPackage ? `Edit ${labPackage.name}` : "Add a package"}
          </SheetTitle>
          <SheetDescription>
            A set of your tests booked together at one price.
          </SheetDescription>
        </SheetHeader>
        <form
          method="post"
          onSubmit={onSubmit}
          className="grid gap-5 px-4 pb-6"
          noValidate
        >
          <input type="hidden" name="id" value={labPackage?.id ?? ""} />
          <FormField id={id("name")} label="Name" error={fieldError("name")}>
            <Input
              id={id("name")}
              name="name"
              maxLength={80}
              defaultValue={saved?.name ?? ""}
              placeholder="e.g. Diabetes Care"
              {...fieldErrorProps(id("name"), fieldError("name"))}
            />
          </FormField>
          <FormField
            id={id("description")}
            label="Description (optional)"
            error={fieldError("description")}
          >
            <Textarea
              id={id("description")}
              name="description"
              rows={2}
              maxLength={300}
              defaultValue={saved?.description ?? ""}
              placeholder="Who it's for, in a sentence."
              {...fieldErrorProps(id("description"), fieldError("description"))}
            />
          </FormField>

          <fieldset
            className="grid gap-2"
            aria-describedby={
              fieldError("testIds") ? id("tests-error") : undefined
            }
          >
            <legend className="mb-2 text-sm font-medium">
              Tests ({selected.length} chosen, {PACKAGE_TESTS.min} to{" "}
              {PACKAGE_TESTS.max})
            </legend>
            <div className="grid max-h-72 gap-1 overflow-y-auto rounded-xl border p-2">
              {tests.map((test) => (
                <label
                  key={test.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <Checkbox
                    name="testIds"
                    value={test.id}
                    checked={selected.includes(test.id)}
                    onCheckedChange={(checked) => toggle(test.id, checked)}
                  />
                  <span className="min-w-0 flex-1">{test.name}</span>
                  <span className="text-muted-foreground">
                    {formatFee(test.price)}
                  </span>
                </label>
              ))}
            </div>
            {fieldError("testIds") && (
              <p id={id("tests-error")} className="text-xs text-destructive">
                {fieldError("testIds")}
              </p>
            )}
          </fieldset>

          <FormField
            id={id("price")}
            label="Package price (Rs)"
            hint={
              separatePrice > 0
                ? `Booked one by one: ${formatFee(separatePrice)}${savings ? `. Patients save ${savings}%.` : "."}`
                : undefined
            }
            error={fieldError("price")}
          >
            <Input
              id={id("price")}
              name="price"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              {...fieldErrorProps(id("price"), fieldError("price"))}
            />
          </FormField>

          <SettingRow
            label="Listed"
            description="Patients can find and compare it."
            htmlFor={id("listed")}
          >
            <Switch
              id={id("listed")}
              name="listed"
              defaultChecked={saved?.listed ?? true}
            />
          </SettingRow>

          <div className="flex justify-end border-t pt-4">
            <Button type="submit" disabled={pending} className="gap-2">
              {pending && <Loader2Icon className="animate-spin" aria-hidden />}
              {pending
                ? "Saving…"
                : labPackage
                  ? "Save changes"
                  : "Add package"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
