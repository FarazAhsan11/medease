"use client";

import { Loader2Icon, PencilIcon, PlusIcon } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { FormSection } from "@/components/shared/form-section";
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
import { genders } from "@/features/auth/data/registration-options";
import { saveFamilyMember } from "@/features/family/actions/save-family-member";
import {
  familyMemberName,
  type FamilyMember,
} from "@/features/family/lib/family-members";
import {
  familyRelations,
  relationLabels,
} from "@/features/family/lib/relations";
import { MedicalProfileFields } from "@/features/medical-profile/components/medical-profile-fields";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

const ID_PREFIX = "family";
const id = (field: string) => `${ID_PREFIX}-${field}`;

const relationOptions = familyRelations.map((relation) => ({
  value: relation,
  label: relationLabels[relation],
}));

type FamilyMemberSheetProps = {
  // Edits this person; without it the sheet adds someone new.
  member?: FamilyMember;
  disabled?: boolean;
};

export function FamilyMemberSheet({
  member,
  disabled,
}: FamilyMemberSheetProps) {
  const [open, setOpen] = useState(false);
  const { pending, onSubmit, fieldError } = useFormAction(
    saveFamilyMember,
    initialFormState,
    { onSuccess: () => setOpen(false) },
  );

  const input = (
    name: "firstName" | "lastName" | "dateOfBirth",
    label: string,
    props: ComponentProps<typeof Input> = {},
  ) => (
    <FormField id={id(name)} label={label} error={fieldError(name)}>
      <Input
        id={id(name)}
        name={name}
        defaultValue={member?.[name] ?? ""}
        autoComplete="off"
        {...fieldErrorProps(id(name), fieldError(name))}
        {...props}
      />
    </FormField>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {member ? (
        <SheetTrigger
          render={
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground"
              aria-label={`Edit ${familyMemberName(member)}`}
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
            {member
              ? `Edit ${familyMemberName(member)}`
              : "Add a family member"}
          </SheetTitle>
          <SheetDescription>
            Doctors you book for them see these details.
          </SheetDescription>
        </SheetHeader>
        <form
          method="post"
          onSubmit={onSubmit}
          className="grid gap-6 px-4 pb-6"
          noValidate
        >
          <input type="hidden" name="id" value={member?.id ?? ""} />
          <FormSection title="About them">
            {input("firstName", "First name")}
            {input("lastName", "Last name")}
            <SelectField
              id={id("relation")}
              name="relation"
              label="Relation to you"
              options={relationOptions}
              defaultValue={member?.relation}
              emptyLabel="Select…"
              error={fieldError("relation")}
            />
            {input("dateOfBirth", "Date of birth", {
              type: "date",
              min: "1900-01-01",
            })}
            <SelectField
              id={id("gender")}
              name="gender"
              label="Gender"
              options={genders}
              defaultValue={member?.gender}
              error={fieldError("gender")}
            />
          </FormSection>
          <div className="border-t pt-5">
            <MedicalProfileFields
              idPrefix={ID_PREFIX}
              values={member ?? null}
              fieldError={fieldError}
            />
          </div>
          <div className="flex justify-end border-t pt-4">
            <Button type="submit" disabled={pending} className="gap-2">
              {pending && <Loader2Icon className="animate-spin" aria-hidden />}
              {pending ? "Saving…" : member ? "Save changes" : "Add person"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
