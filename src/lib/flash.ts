import { z } from "zod";

// A one-time toast that survives a redirect: Server Actions and Route
// Handlers set it, the app shell shows it once and the client clears it.
export const FLASH_COOKIE = "flash";

export const flashSchema = z.object({
  id: z.string(),
  type: z.enum(["success", "error", "info"]),
  message: z.string(),
});

export type Flash = z.infer<typeof flashSchema>;
