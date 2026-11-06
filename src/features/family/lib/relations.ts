// Who a visit or record is for: the account holder ("self") or someone they
// care for. Keep in step with the relation checks in the family members
// migration. Safe to import from client components.

export const familyRelations = [
  "child",
  "parent",
  "spouse",
  "sibling",
  "other",
] as const;

export type FamilyRelation = (typeof familyRelations)[number];
export type CareRecipientRelation = "self" | FamilyRelation;

export const relationLabels: Record<CareRecipientRelation, string> = {
  self: "Myself",
  child: "Child",
  parent: "Parent",
  spouse: "Spouse",
  sibling: "Sibling",
  other: "Other",
};

export const isFamilyRelation = (value: string): value is FamilyRelation =>
  (familyRelations as readonly string[]).includes(value);

export type BookedFor = {
  patientName: string;
  careRecipientName: string;
  careRecipientRelation: CareRecipientRelation;
};

// For doctors, under the name of a family member's visit: who on the account
// booked it, e.g. "Sara Khan's child". Null when the holder booked for
// themselves.
export function bookedByLabel({
  patientName,
  careRecipientRelation,
}: BookedFor) {
  if (careRecipientRelation === "self") return null;
  if (careRecipientRelation === "other") return `Booked by ${patientName}`;
  return `${patientName}'s ${careRecipientRelation}`;
}

// For the account holder, on their own list: who a visit or prescription is
// for. Null for their own.
export function bookedForLabel({
  careRecipientName,
  careRecipientRelation,
}: BookedFor) {
  return careRecipientRelation === "self" ? null : `For ${careRecipientName}`;
}
