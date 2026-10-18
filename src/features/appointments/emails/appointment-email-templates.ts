import type { Appointment } from "@/features/appointments/lib/appointments";
import { formatDate, formatTime } from "@/lib/datetime";
import { formatFee } from "@/lib/format";
import { renderEmail } from "@/lib/render-email";

const when = (appointment: Appointment) =>
  `${formatDate(appointment.startsAt, appointment.timezone)} at ${formatTime(appointment.startsAt, appointment.timezone)}`;

export function bookingConfirmationEmail(
  appointment: Appointment,
  url: string,
) {
  return renderEmail({
    subject: `Appointment booked with ${appointment.doctorName}`,
    preview: `You're booked for ${when(appointment)}.`,
    heading: "Your appointment is booked",
    paragraphs: [
      `Hi ${appointment.patientName},`,
      `You're booked with ${appointment.doctorName} (${appointment.doctorSpecialization}) on ${when(appointment)}.`,
      `Consultation fee: ${formatFee(appointment.consultationFee)}. If your plans change, please cancel from your appointments page so someone else can take the slot.`,
    ],
    action: { label: "View my appointments", url },
  });
}

export function newBookingEmail(appointment: Appointment, url: string) {
  return renderEmail({
    subject: `New appointment: ${appointment.patientName}, ${when(appointment)}`,
    preview: `${appointment.patientName} booked ${when(appointment)}.`,
    heading: "You have a new appointment",
    paragraphs: [
      `${appointment.patientName} booked a consultation with you on ${when(appointment)}.`,
      appointment.reason
        ? `Reason for visit: ${appointment.reason}`
        : "No reason for the visit was given.",
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
      ? `${appointment.doctorName} cancelled your appointment on ${when(appointment)}.`
      : `${appointment.patientName} cancelled their appointment on ${when(appointment)}.`;

  return renderEmail({
    subject: `Appointment cancelled: ${when(appointment)}`,
    preview: byOther,
    heading: "An appointment was cancelled",
    paragraphs: [
      recipient === "patient" ? `Hi ${appointment.patientName},` : "Hello,",
      byOther,
      ...(appointment.cancellationReason
        ? [`Reason: ${appointment.cancellationReason}`]
        : []),
      recipient === "patient"
        ? "We're sorry for the change. You can book another time that suits you."
        : "The slot is open again for other patients.",
    ],
    action: {
      label:
        recipient === "patient" ? "Book another time" : "Open your schedule",
      url,
    },
  });
}
