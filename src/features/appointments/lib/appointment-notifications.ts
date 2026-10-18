import "server-only";

import { after } from "next/server";

import { doctorRoutes, patientRoutes } from "@/config/routes";
import {
  bookingConfirmationEmail,
  cancellationEmail,
  newBookingEmail,
} from "@/features/appointments/emails/appointment-email-templates";
import type { Appointment } from "@/features/appointments/lib/appointments";
import { sendMail } from "@/lib/mailer.server";
import type { EmailContent } from "@/lib/render-email";
import { getSiteUrl } from "@/lib/site-url.server";

type Mail = { to: string | null; content: EmailContent };

// Emails go out after the response, so a slow SMTP server never delays the
// booking. A failed email is logged (by the mailer) and never undoes it.
function sendAfterResponse(mails: Mail[]) {
  after(async () => {
    await Promise.allSettled(
      mails
        .filter((mail): mail is Mail & { to: string } => Boolean(mail.to))
        .map((mail) => sendMail({ to: mail.to, ...mail.content })),
    );
  });
}

export async function notifyAppointmentBooked(
  appointment: Appointment,
  doctorEmail: string | null,
) {
  const siteUrl = await getSiteUrl();
  sendAfterResponse([
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

export async function notifyAppointmentCancelled(
  appointment: Appointment,
  doctorEmail: string | null,
) {
  const siteUrl = await getSiteUrl();
  // Tell whoever didn't cancel.
  sendAfterResponse([
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
