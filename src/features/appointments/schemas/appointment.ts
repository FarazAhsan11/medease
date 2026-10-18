import { z } from "zod";

const optionalNote = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => value || null);

export const bookAppointmentSchema = z.object({
  doctorId: z.uuid("Pick a doctor first."),
  startsAt: z.iso.datetime({ offset: true, message: "Pick a time slot." }),
  reason: optionalNote(500, "Keep the reason under 500 characters."),
});

export const cancelAppointmentSchema = z.object({
  appointmentId: z.uuid(),
  reason: optionalNote(500, "Keep the reason under 500 characters."),
});

export const appointmentOutcomeSchema = z.object({
  appointmentId: z.uuid(),
  outcome: z.enum(["completed", "no_show"]),
});

export const appointmentNotesSchema = z.object({
  appointmentId: z.uuid(),
  notes: z
    .string()
    .max(5000, "Keep notes under 5,000 characters.")
    .transform((value) => value.trim()),
});
