import {
  labRoleDescriptions,
  labRoleLabels,
  labStaffRoles,
} from "@/features/lab-staff/lib/lab-permissions";

// What each staff role can do, beside the role choice.
export function LabRoleList() {
  return (
    <dl className="grid gap-2 rounded-lg bg-muted/50 p-3 text-xs">
      {labStaffRoles.map((role) => (
        <div key={role}>
          <dt className="font-medium">{labRoleLabels[role]}</dt>
          <dd className="text-muted-foreground">{labRoleDescriptions[role]}</dd>
        </div>
      ))}
    </dl>
  );
}
