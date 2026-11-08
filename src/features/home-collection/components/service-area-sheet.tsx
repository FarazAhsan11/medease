"use client";

import { Loader2Icon, PencilIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { SelectField } from "@/components/shared/select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { saveServiceArea } from "@/features/home-collection/actions/save-service-area";
import {
  MAX_AREA_NOTE,
  type ServiceArea,
} from "@/features/home-collection/lib/home-collection";
import { useFormAction } from "@/hooks/use-form-action";
import { cities } from "@/lib/cities";
import { initialFormState } from "@/lib/form-state";

type ServiceAreaSheetProps = {
  // Edits this city; without it the sheet adds a new one.
  area?: ServiceArea;
  // Cities already in the list, left out of the choices.
  taken: string[];
};

export function ServiceAreaSheet({ area, taken }: ServiceAreaSheetProps) {
  const [open, setOpen] = useState(false);
  const { pending, onSubmit, fieldError } = useFormAction(
    saveServiceArea,
    initialFormState,
    { onSuccess: () => setOpen(false) },
  );
  const choices = cities.filter(
    (city) => city === area?.city || !taken.includes(city),
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {area ? (
        <SheetTrigger
          render={
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground"
              aria-label={`Edit ${area.city}`}
            />
          }
        >
          <PencilIcon />
        </SheetTrigger>
      ) : (
        <SheetTrigger
          disabled={choices.length === 0}
          render={<Button size="sm" variant="outline" className="gap-1.5" />}
        >
          <PlusIcon aria-hidden />
          Add city
        </SheetTrigger>
      )}
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{area ? `Edit ${area.city}` : "Add a city"}</SheetTitle>
          <SheetDescription>
            Patients with an address in this city can book a collector.
          </SheetDescription>
        </SheetHeader>
        {/* Remounts on each open, so an edit starts from the saved values. */}
        {open && (
          <form
            method="post"
            onSubmit={onSubmit}
            className="grid gap-4 px-4 pb-6"
            noValidate
          >
            <input type="hidden" name="id" value={area?.id ?? ""} />
            <SelectField
              id="area-city"
              name="city"
              label="City"
              options={choices}
              defaultValue={area?.city}
              emptyLabel="Select…"
              error={fieldError("city")}
            />
            <FormField
              id="area-fee"
              label="Collection fee (PKR)"
              hint="Enter 0 for free collection."
              error={fieldError("fee")}
            >
              <Input
                id="area-fee"
                name="fee"
                type="number"
                min={0}
                step={50}
                inputMode="numeric"
                defaultValue={area?.fee ?? ""}
                {...fieldErrorProps("area-fee", fieldError("fee"))}
              />
            </FormField>
            <FormField
              id="area-note"
              label="Note for patients (optional)"
              hint={`Which parts you cover, or what you don't. Up to ${MAX_AREA_NOTE} characters.`}
              error={fieldError("note")}
            >
              <Textarea
                id="area-note"
                name="note"
                rows={2}
                maxLength={MAX_AREA_NOTE}
                placeholder="All of the city except the cantonment"
                defaultValue={area?.note ?? ""}
                {...fieldErrorProps("area-note", fieldError("note"))}
              />
            </FormField>
            <div className="flex justify-end border-t pt-4">
              <Button type="submit" disabled={pending} className="gap-2">
                {pending && (
                  <Loader2Icon className="animate-spin" aria-hidden />
                )}
                {pending ? "Saving…" : area ? "Save changes" : "Add city"}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
