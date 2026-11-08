"use client";

import { Loader2Icon, PencilIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { SelectField } from "@/components/shared/select-field";
import { SettingRow } from "@/components/shared/setting-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";
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
import { saveLabTest } from "@/features/lab-catalog/actions/save-lab-test";
import type {
  LabCatalogTest,
  LabTestType,
} from "@/features/lab-catalog/data/lab-catalog";
import {
  categoryLabels,
  labTestCategories,
  turnaroundOptions,
} from "@/features/lab-catalog/lib/lab-catalog";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

const id = (field: string) => `lab-test-${field}`;

type LabTestSheetProps =
  // Adds one of these tests, which the lab doesn't offer yet.
  | { testTypes: LabTestType[]; test?: never }
  // Edits a test already in the catalog.
  | { test: LabCatalogTest; testTypes?: never };

export function LabTestSheet({ testTypes, test }: LabTestSheetProps) {
  const [open, setOpen] = useState(false);
  const [testTypeId, setTestTypeId] = useState("");
  // The values the form opened with. Saving refreshes `test` while the sheet
  // is still closing, and a form field's default can't change once it's set.
  const [saved, setSaved] = useState(test);
  const { pending, onSubmit, fieldError } = useFormAction(
    saveLabTest,
    initialFormState,
    {
      onSuccess: () => {
        setOpen(false);
        setTestTypeId("");
      },
    },
  );

  const sharedPreparation = test
    ? test.sharedPreparation
    : testTypes.find((type) => type.id === testTypeId)?.preparation;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) setSaved(test);
        setOpen(next);
      }}
    >
      {test ? (
        <SheetTrigger
          render={
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground"
              aria-label={`Edit ${test.name}`}
            />
          }
        >
          <PencilIcon />
        </SheetTrigger>
      ) : (
        <SheetTrigger
          disabled={testTypes.length === 0}
          render={<Button className="h-9 gap-1.5 px-4" />}
        >
          <PlusIcon aria-hidden />
          Add test
        </SheetTrigger>
      )}
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle>{test ? test.name : "Add a test"}</SheetTitle>
          <SheetDescription>
            Your price and turnaround, shown to patients next to other labs.
          </SheetDescription>
        </SheetHeader>
        <form
          method="post"
          onSubmit={onSubmit}
          className="grid gap-5 px-4 pb-6"
          noValidate
        >
          {test ? (
            <input type="hidden" name="testTypeId" value={test.testTypeId} />
          ) : (
            <FormField
              id={id("type")}
              label="Test"
              hint="Not on the list? Contact support and we'll add it."
              error={fieldError("testTypeId")}
            >
              <NativeSelect
                id={id("type")}
                name="testTypeId"
                value={testTypeId}
                onChange={(event) => setTestTypeId(event.target.value)}
                className="w-full"
                {...fieldErrorProps(id("type"), fieldError("testTypeId"))}
              >
                <NativeSelectOption value="">Choose a test…</NativeSelectOption>
                {labTestCategories.map((category) => {
                  const options = testTypes.filter(
                    (type) => type.category === category,
                  );
                  if (options.length === 0) return null;
                  return (
                    <NativeSelectOptGroup
                      key={category}
                      label={categoryLabels[category]}
                    >
                      {options.map((type) => (
                        <NativeSelectOption key={type.id} value={type.id}>
                          {type.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelectOptGroup>
                  );
                })}
              </NativeSelect>
            </FormField>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              id={id("price")}
              label="Price (Rs)"
              error={fieldError("price")}
            >
              <Input
                id={id("price")}
                name="price"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                defaultValue={saved?.price ?? ""}
                {...fieldErrorProps(id("price"), fieldError("price"))}
              />
            </FormField>
            <SelectField
              id={id("turnaround")}
              name="turnaroundHours"
              label="Results ready in"
              options={turnaroundOptions}
              defaultValue={saved ? String(saved.turnaroundHours) : "24"}
              emptyLabel="Choose…"
              error={fieldError("turnaroundHours")}
            />
          </div>

          <FormField
            id={id("preparation")}
            label="Preparation note (optional)"
            hint={
              sharedPreparation
                ? `Leave blank to show ours: "${sharedPreparation}"`
                : "Leave blank to show our standard note for this test."
            }
            error={fieldError("preparation")}
          >
            <Textarea
              id={id("preparation")}
              name="preparation"
              rows={3}
              maxLength={300}
              defaultValue={saved?.preparation ?? ""}
              {...fieldErrorProps(id("preparation"), fieldError("preparation"))}
            />
          </FormField>

          <div className="grid gap-2">
            <SettingRow
              label="Home collection"
              description="Your collector can take this sample at home. Patients see it while home collection is on."
              htmlFor={id("home")}
            >
              <Switch
                id={id("home")}
                name="homeCollection"
                defaultChecked={saved?.homeCollection ?? false}
              />
            </SettingRow>
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
          </div>

          <div className="flex justify-end border-t pt-4">
            <Button type="submit" disabled={pending} className="gap-2">
              {pending && <Loader2Icon className="animate-spin" aria-hidden />}
              {pending ? "Saving…" : test ? "Save changes" : "Add test"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
