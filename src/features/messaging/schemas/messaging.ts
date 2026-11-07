import { z } from "zod";

import { MESSAGE_MAX_LENGTH } from "../lib/messaging";

export const sendMessageSchema = z.object({
  conversationId: z.uuid(),
  body: z
    .string()
    .trim()
    .min(1, "Write a message first.")
    .max(MESSAGE_MAX_LENGTH, `Keep it under ${MESSAGE_MAX_LENGTH} characters.`),
});

export type SendMessageInput = z.input<typeof sendMessageSchema>;

export const openConversationSchema = z.object({
  otherId: z.uuid(),
});

export const messageWindowSchema = z.object({
  conversationId: z.uuid(),
  action: z.enum(["extend", "close"]),
});
