import { z } from "zod";

import type { FormState } from "@/lib/form-state";

export const twoFactorCodeSchema = z.object({
  factorId: z.uuid(),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."),
});

export type TwoFactorSetupState = FormState & {
  factorId?: string;
  qrCode?: string;
  secret?: string;
};
