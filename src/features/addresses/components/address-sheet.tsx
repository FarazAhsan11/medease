"use client";

import { Loader2Icon, PencilIcon, PlusIcon } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { FormSection } from "@/components/shared/form-section";
import { SelectField } from "@/components/shared/select-field";
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
import { Textarea } from "@/components/ui/textarea";
import { saveAddress } from "@/features/addresses/actions/save-address";
import type { PatientAddress } from "@/features/addresses/lib/addresses";
import { useFormAction } from "@/hooks/use-form-action";
import { cities } from "@/lib/cities";
import { initialFormState } from "@/lib/form-state";

const id = (field: string) => `address-${field}`;

type TextField = "label" | "area" | "landmark" | "contactName" | "contactPhone";

type AddressSheetProps = {
  // Edits this address; without it the sheet adds a new one.
  address?: PatientAddress;
  // Starting values for a new address, such as the account phone.
  defaults?: Partial<PatientAddress>;
  // The first address is the default whatever the patient ticks.
  first?: boolean;
  disabled?: boolean;
};

export function AddressSheet({
  address,
  defaults,
  first,
  disabled,
}: AddressSheetProps) {
  const [open, setOpen] = useState(false);
  const { pending, onSubmit, fieldError } = useFormAction(
    saveAddress,
    initialFormState,
    { onSuccess: () => setOpen(false) },
  );
  const values = address ?? defaults;

  const input = (
    name: TextField,
    label: string,
    props: ComponentProps<typeof Input> & { hint?: string } = {},
  ) => {
    // The class places the field in the grid, so it goes on the wrapper.
    const { hint, className, ...rest } = props;
    return (
      <FormField
        id={id(name)}
        label={label}
        hint={hint}
        error={fieldError(name)}
        className={className}
      >
        <Input
          id={id(name)}
          name={name}
          defaultValue={values?.[name] ?? ""}
          {...fieldErrorProps(id(name), fieldError(name))}
          {...rest}
        />
      </FormField>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {address ? (
        <SheetTrigger
          render={
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground"
              aria-label={`Edit ${address.label}`}
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
          Add
        </SheetTrigger>
      )}
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle>
            {address ? `Edit ${address.label}` : "Add an address"}
          </SheetTitle>
          <SheetDescription>
            Used for home sample collection. Only you can see your saved
            addresses.
          </SheetDescription>
        </SheetHeader>
        <form
          method="post"
          onSubmit={onSubmit}
          className="grid gap-6 px-4 pb-6"
          noValidate
        >
          <input type="hidden" name="id" value={address?.id ?? ""} />
          <FormSection title="Address">
            {input("label", "Name", {
              placeholder: "Home, Parents' home, Office",
              autoComplete: "off",
              className: "sm:col-span-2",
            })}
            <FormField
              id={id("streetAddress")}
              label="House and street"
              hint="House or flat number, street, and block or phase."
              error={fieldError("streetAddress")}
              className="sm:col-span-2"
            >
              <Textarea
                id={id("streetAddress")}
                name="streetAddress"
                rows={2}
                autoComplete="street-address"
                defaultValue={values?.streetAddress ?? ""}
                {...fieldErrorProps(
                  id("streetAddress"),
                  fieldError("streetAddress"),
                )}
              />
            </FormField>
            {input("area", "Area or sector", {
              placeholder: "DHA Phase 5, G-10/2",
              autoComplete: "address-level3",
            })}
            <SelectField
              id={id("city")}
              name="city"
              label="City"
              options={cities}
              defaultValue={values?.city}
              emptyLabel="Select…"
              error={fieldError("city")}
            />
            {input("landmark", "Nearby landmark (optional)", {
              placeholder: "Near the mosque, opposite the park",
              autoComplete: "off",
              className: "sm:col-span-2",
            })}
          </FormSection>
          <FormSection title="Who to contact there">
            {input("contactName", "Name (optional)", { autoComplete: "name" })}
            {input("contactPhone", "Phone", {
              type: "tel",
              autoComplete: "tel",
              hint: "The collector calls this number before arriving.",
            })}
          </FormSection>
          {address?.isDefault || first ? (
            <p className="text-sm text-muted-foreground">
              This is your default address for bookings.
            </p>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox name="isDefault" value="on" />
              Use as my default address
            </label>
          )}
          <div className="flex justify-end border-t pt-4">
            <Button type="submit" disabled={pending} className="gap-2">
              {pending && <Loader2Icon className="animate-spin" aria-hidden />}
              {pending ? "Saving…" : address ? "Save changes" : "Save address"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
