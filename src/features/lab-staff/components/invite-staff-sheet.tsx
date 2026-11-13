"use client";

import { Loader2Icon, UserPlusIcon } from "lucide-react";
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
import { inviteLabStaff } from "@/features/lab-staff/actions/invite-lab-staff";
import { LabRoleList } from "@/features/lab-staff/components/lab-role-list";
import {
  labRoleLabels,
  labStaffRoles,
} from "@/features/lab-staff/lib/lab-permissions";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

const roleOptions = labStaffRoles.map((role) => ({
  value: role,
  label: labRoleLabels[role],
}));

type InviteStaffSheetProps = {
  // At the staff limit, the button is off.
  disabled?: boolean;
};

export function InviteStaffSheet({ disabled = false }: InviteStaffSheetProps) {
  const [open, setOpen] = useState(false);
  const { pending, onSubmit, fieldError } = useFormAction(
    inviteLabStaff,
    initialFormState,
    { onSuccess: () => setOpen(false) },
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        disabled={disabled}
        render={<Button className="h-9 gap-1.5 px-4" />}
      >
        <UserPlusIcon aria-hidden />
        Invite staff
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Invite staff</SheetTitle>
          <SheetDescription>
            They get an email to set a password, then pair an authenticator
            app. Each person signs in with their own account.
          </SheetDescription>
        </SheetHeader>
        {/* Remounts on each open, so the form starts empty. */}
        {open && (
          <form
            method="post"
            onSubmit={onSubmit}
            className="grid gap-4 px-4 pb-6"
            noValidate
          >
            <FormField
              id="staff-name"
              label="Full name"
              error={fieldError("fullName")}
            >
              <Input
                id="staff-name"
                name="fullName"
                autoComplete="off"
                maxLength={120}
                {...fieldErrorProps("staff-name", fieldError("fullName"))}
              />
            </FormField>
            <FormField
              id="staff-email"
              label="Work email"
              hint="An address that doesn't already have a MedEase account."
              error={fieldError("email")}
            >
              <Input
                id="staff-email"
                name="email"
                type="email"
                autoComplete="off"
                {...fieldErrorProps("staff-email", fieldError("email"))}
              />
            </FormField>
            <SelectField
              id="staff-role"
              name="role"
              label="Role"
              options={roleOptions}
              emptyLabel="Select…"
              error={fieldError("role")}
            />
            <LabRoleList />
            <div className="flex justify-end border-t pt-4">
              <Button type="submit" disabled={pending} className="gap-2">
                {pending && (
                  <Loader2Icon className="animate-spin" aria-hidden />
                )}
                {pending ? "Sending…" : "Send invitation"}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
