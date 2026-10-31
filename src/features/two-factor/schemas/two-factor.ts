import { z } from "zod";

import type { FormState } from "@/lib/form-state";

export const twoFactorCodeSchema = z.object({
  factorId: z.uuid(),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."),
});

export const recoveryCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(10, "Enter one of your recovery codes.")
    .max(20, "Enter one of your recovery codes."),
});

export type TwoFactorSetupState = FormState & {
  factorId?: string;
  qrCode?: string;
  secret?: string;
};

// Plain codes travel only in this response, shown once and never stored.
export type RecoveryCodesState = FormState & {
  recoveryCodes?: string[];
};
