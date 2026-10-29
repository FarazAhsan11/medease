import type { Appointment } from "@/features/appointments/lib/appointments";
import { formatDate, formatTime } from "@/lib/datetime";
import { formatFee } from "@/lib/format";
import { renderEmail } from "@/lib/render-email";

// Inboxes are less private than the app, so emails never carry the doctor's
// name or specialty, the reason for the visit or a cancellation reason; those
// stay behind sign-in. Subjects and previews (shown on lock screens) name
// no one.

const when = (appointment: Appointment) =>
  `${formatDate(appointment.startsAt, appointment.timezone)} at ${formatTime(appointment.startsAt, appointment.timezone)}`;

export function bookingConfirmationEmail(
  appointment: Appointment,
  url: string,
) {
  return renderEmail({
    subject: "Your appointment is booked",
    preview: `You're booked for ${when(appointment)}.`,
    heading: "Your appointment is booked",
    paragraphs: [
      `Hi ${appointment.patientName},`,
      `Your consultation is booked for ${when(appointment)}. Sign in to see the details.`,
      `Consultation fee: ${formatFee(appointment.consultationFee)}. If your plans change, please cancel from your appointments page so someone else can take the slot.`,
    ],
    action: { label: "View my appointments", url },
  });
}

export function newBookingEmail(appointment: Appointment, url: string) {
  return renderEmail({
    subject: `New appointment: ${when(appointment)}`,
    preview: `A patient booked ${when(appointment)}.`,
    heading: "You have a new appointment",
    paragraphs: [
      `${appointment.patientName} booked a consultation with you on ${when(appointment)}.`,
      "Open your schedule to see the details.",
    ],
    action: { label: "Open your schedule", url },
  });
}

export function cancellationEmail(
  appointment: Appointment,
  recipient: "patient" | "doctor",
  url: string,
) {
  const byOther =
    recipient === "patient"
      ? `Your doctor cancelled your appointment on ${when(appointment)}.`
      : `${appointment.patientName} cancelled their appointment on ${when(appointment)}.`;

  return renderEmail({
    subject: `Appointment cancelled: ${when(appointment)}`,
    preview: `An appointment on ${when(appointment)} was cancelled.`,
    heading: "An appointment was cancelled",
    paragraphs: [
      recipient === "patient" ? `Hi ${appointment.patientName},` : "Hello,",
      byOther,
      recipient === "patient"
        ? "We're sorry for the change. Sign in to see the details, or book another time that suits you."
        : "The slot is open again for other patients. Sign in to see the details.",
    ],
    action: {
      label:
        recipient === "patient" ? "Book another time" : "Open your schedule",
      url,
    },
  });
}
