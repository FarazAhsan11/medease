import { z } from "zod";

// Who in a lab can do what (LAB-07). The database holds the same matrix in
// private.lab_role_can and enforces it; this copy only decides which pages,
// links and buttons to show. Keep the two in step.

export const labStaffRoles = [
  "front_desk",
  "collector",
  "pathologist",
] as const;
export const labMemberRoleSchema = z.enum(["admin", ...labStaffRoles]);
export const labStaffRoleSchema = z.enum(labStaffRoles);

export type LabMemberRole = z.infer<typeof labMemberRoleSchema>;
export type LabStaffRole = z.infer<typeof labStaffRoleSchema>;

export type LabPermission =
  | "bookings.view"
  | "bookings.view_all"
  | "bookings.collect"
  | "bookings.assign"
  | "bookings.process"
  | "bookings.cancel"
  | "reports.view"
  | "reports.publish"
  | "catalog"
  | "home_collection"
  | "profile"
  | "staff";

const staffPermissions: Record<LabStaffRole, readonly LabPermission[]> = {
  front_desk: [
    "bookings.view",
    "bookings.view_all",
    "bookings.collect",
    "bookings.assign",
    "bookings.cancel",
    "reports.view",
  ],
  collector: ["bookings.view", "bookings.collect"],
  pathologist: [
    "bookings.view",
    "bookings.view_all",
    "bookings.process",
    "reports.view",
    "reports.publish",
  ],
};

export function labRoleCan(role: LabMemberRole, permission: LabPermission) {
  return role === "admin" || staffPermissions[role].includes(permission);
}

export const labRoleLabels: Record<LabMemberRole, string> = {
  admin: "Lab admin",
  front_desk: "Front desk",
  collector: "Sample collector",
  pathologist: "Pathologist",
};

export const labRoleDescriptions: Record<LabStaffRole, string> = {
  front_desk:
    "Sees bookings and reports, sends collectors on home visits, marks samples collected, cancels.",
  collector:
    "Sees lab visits and the home visits given to them, and marks samples collected.",
  pathologist: "Moves samples into processing and uploads reports.",
};

// The staff role also sits in app_metadata (written only with the secret key),
// so the header can pick links without a query. It may lag a change by up to
// an hour and never decides access. The lab admin has none.
export function getLabRoleFromAppMetadata(appMetadata: unknown): LabMemberRole {
  const result = z
    .object({ lab_role: labStaffRoleSchema })
    .safeParse(appMetadata ?? {});

  return result.success ? result.data.lab_role : "admin";
}

// The right a booking move needs, as move_lab_booking decides it.
export function permissionForMove(toStatus: string): LabPermission {
  if (toStatus === "sample_collected") return "bookings.collect";
  if (toStatus === "cancelled") return "bookings.cancel";
  if (toStatus === "report_ready") return "reports.publish";
  return "bookings.process";
}
