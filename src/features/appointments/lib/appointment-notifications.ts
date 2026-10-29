import "server-only";

import { doctorRoutes, patientRoutes } from "@/config/routes";
import {
  bookingConfirmationEmail,
  cancellationEmail,
  newBookingEmail,
} from "@/features/appointments/emails/appointment-email-templates";
import type { Appointment } from "@/features/appointments/lib/appointments";
import { getSiteUrl } from "@/lib/env.server";
import { sendMailAfterResponse } from "@/lib/mailer.server";

export function notifyAppointmentBooked(
  appointment: Appointment,
  doctorEmail: string | null,
) {
  const siteUrl = getSiteUrl();
  sendMailAfterResponse([
    {
      to: appointment.patientEmail,
      content: bookingConfirmationEmail(
        appointment,
        new URL(patientRoutes.appointments, siteUrl).toString(),
      ),
    },
    {
      to: doctorEmail,
      content: newBookingEmail(
        appointment,
        new URL(doctorRoutes.appointments, siteUrl).toString(),
      ),
    },
  ]);
}

export function notifyAppointmentCancelled(
  appointment: Appointment,
  doctorEmail: string | null,
) {
  const siteUrl = getSiteUrl();
  // Tell whoever didn't cancel.
  sendMailAfterResponse([
    appointment.cancelledBy === "doctor"
      ? {
          to: appointment.patientEmail,
          content: cancellationEmail(
            appointment,
            "patient",
            new URL(patientRoutes.findDoctor, siteUrl).toString(),
          ),
        }
      : {
          to: doctorEmail,
          content: cancellationEmail(
            appointment,
            "doctor",
            new URL(doctorRoutes.appointments, siteUrl).toString(),
          ),
        },
  ]);
}
