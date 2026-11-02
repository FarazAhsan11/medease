import type { DashboardRole } from "@/config/dashboards";

// Slugs from src/features/legal/data. Keep in step with the check on
// user_consents.document in the database.
export type ConsentDocument =
  "terms" | "privacy" | "telemedicine-consent" | "partner-terms";

export const TELEMEDICINE_CONSENT = "telemedicine-consent";

// Admins are staff, created by `npm run admin:create`, so sign-up doesn't apply.
export const requiredConsents: Record<
  DashboardRole,
  readonly ConsentDocument[]
> = {
  patient: ["terms", "privacy", TELEMEDICINE_CONSENT],
  doctor: ["terms", "privacy", "partner-terms"],
  lab: ["terms", "privacy", "partner-terms"],
  admin: [],
};
