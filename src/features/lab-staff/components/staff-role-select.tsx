"use client";

import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { changeLabStaffRole } from "@/features/lab-staff/actions/change-lab-staff-role";
import {
  labRoleLabels,
  labStaffRoles,
  type LabStaffRole,
} from "@/features/lab-staff/lib/lab-permissions";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type StaffRoleSelectProps = {
  userId: string;
  name: string;
  role: LabStaffRole;
};

// Saves as soon as a new role is picked; the database applies it at once.
export function StaffRoleSelect({ userId, name, role }: StaffRoleSelectProps) {
  const { pending, onSubmit } = useFormAction(
    changeLabStaffRole,
    initialFormState,
  );
  const id = `role-${userId}`;

  return (
    <form method="post" onSubmit={onSubmit}>
      <input type="hidden" name="userId" value={userId} />
      <label htmlFor={id} className="sr-only">
        Role for {name}
      </label>
      <NativeSelect
        id={id}
        name="role"
        // Keyed by the saved role, so a refused change snaps back.
        key={role}
        defaultValue={role}
        disabled={pending}
        size="sm"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {labStaffRoles.map((value) => (
          <NativeSelectOption key={value} value={value}>
            {labRoleLabels[value]}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </form>
  );
}
