import { z } from "zod";

import {
  emailCategoryIds,
  type EmailCategory,
} from "../lib/notification-preferences";

// A switch sends its name only when it's on.
const switchValue = z.literal("on").optional();

export const emailPreferencesSchema = z
  .object(
    Object.fromEntries(emailCategoryIds.map((id) => [id, switchValue])) as {
      [Id in EmailCategory]: typeof switchValue;
    },
  )
  .transform((values) => emailCategoryIds.filter((id) => values[id] === "on"));
