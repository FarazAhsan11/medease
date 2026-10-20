// Prescription shape shared by the patient and doctor dashboards, plus small
// pure helpers. Safe to import from client components.

import type { Appointment } from "@/features/appointments/lib/appointments";
import {
  addDaysToDateKey,
  daysBetweenDateKeys,
  toDateKey,
} from "@/lib/datetime";

// Doctors can write or edit a prescription from the appointment start until
// this many days after. Keep in sync with issue_prescription in the
// prescriptions migration.
export const PRESCRIBE_WINDOW_DAYS = 14;
export const MAX_PRESCRIPTION_ITEMS = 20;
// Courses with this many days left or fewer are flagged to the patient.
export const ENDING_SOON_DAYS = 3;

export const DOSE_TIMES = ["morning", "afternoon", "night"] as const;
export type DoseTime = (typeof DOSE_TIMES)[number];
export const doseTimeLabels: Record<DoseTime, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  night: "Night",
};

export const MEDICINE_FORMS = [
  "tablet",
  "capsule",
  "syrup",
  "injection",
  "drops",
  "cream",
  "inhaler",
  "sachet",
  "other",
] as const;
export type MedicineForm = (typeof MEDICINE_FORMS)[number];
export const medicineFormLabels: Record<MedicineForm, string> = {
  tablet: "Tablet",
  capsule: "Capsule",
  syrup: "Syrup",
  injection: "Injection",
  drops: "Drops",
  cream: "Cream / ointment",
  inhaler: "Inhaler",
  sachet: "Sachet",
  other: "Other",
};

export const FREQUENCIES = ["daily", "weekly", "as_needed"] as const;
export type Frequency = (typeof FREQUENCIES)[number];
export const frequencyLabels: Record<Frequency, string> = {
  daily: "Every day",
  weekly: "Once a week",
  as_needed: "Only when needed",
};

export const MEAL_TIMINGS = [
  "any",
  "before_food",
  "after_food",
  "with_food",
] as const;
export type MealTiming = (typeof MEAL_TIMINGS)[number];
export const mealTimingLabels: Record<MealTiming, string> = {
  any: "Any time",
  before_food: "Before food",
  after_food: "After food",
  with_food: "With food",
};

export type PrescriptionStatus = "active" | "replaced" | "cancelled";

export type PrescriptionItem = {
  id: string;
  medicine: string;
  strength: string | null;
  form: MedicineForm;
  dose: string;
  frequency: Frequency;
  doseTimes: DoseTime[];
  meal: MealTiming;
  // null means ongoing.
  durationDays: number | null;
  instructions: string | null;
};

export type Prescription = {
  id: string;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  status: PrescriptionStatus;
  diagnosis: string | null;
  advice: string | null;
  doctorName: string;
  doctorSpecialization: string;
  doctorLicense: string;
  clinicAddress: string;
  patientName: string;
  timezone: string;
  replacesId: string | null;
  issuedAt: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
  items: PrescriptionItem[];
};

export type PrescriptionItemRow = {
  id: string;
  sort_order: number;
  medicine: string;
  strength: string | null;
  form: MedicineForm;
  dose: string;
  frequency: Frequency;
  dose_times: DoseTime[];
  meal: MealTiming;
  duration_days: number | null;
  instructions: string | null;
};

export type PrescriptionRow = {
  id: string;
  appointment_id: string;
  doctor_id: string;
  patient_id: string;
  status: PrescriptionStatus;
  diagnosis: string | null;
  advice: string | null;
  doctor_name: string;
  doctor_specialization: string;
  doctor_license: string;
  clinic_address: string;
  patient_name: string;
  timezone: string;
  replaces_id: string | null;
  issued_at: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  // Missing on rows returned by the write functions.
  prescription_items?: PrescriptionItemRow[];
};

export function toPrescription(row: PrescriptionRow): Prescription {
  return {
    id: row.id,
    appointmentId: row.appointment_id,
    doctorId: row.doctor_id,
    patientId: row.patient_id,
    status: row.status,
    diagnosis: row.diagnosis,
    advice: row.advice,
    doctorName: row.doctor_name,
    doctorSpecialization: row.doctor_specialization,
    doctorLicense: row.doctor_license,
    clinicAddress: row.clinic_address,
    patientName: row.patient_name,
    timezone: row.timezone,
    replacesId: row.replaces_id,
    issuedAt: row.issued_at,
    cancelledAt: row.cancelled_at,
    cancellationReason: row.cancellation_reason,
    items: [...(row.prescription_items ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({
        id: item.id,
        medicine: item.medicine,
        strength: item.strength,
        form: item.form,
        dose: item.dose,
        frequency: item.frequency,
        doseTimes: item.dose_times,
        meal: item.meal,
        durationDays: item.duration_days,
        instructions: item.instructions,
      })),
  };
}

// What a doctor's appointment lists need to know about its prescription.
export type PrescriptionSummary = {
  id: string;
  status: Exclude<PrescriptionStatus, "replaced">;
  medicines: string[];
};

// Why a doctor can't write (or edit) a prescription for an appointment right
// now, or null if they can. Mirrors the checks in issue_prescription.
export type PrescribeBlock =
  "cancelled" | "no_show" | "not_started" | "window_closed";

const DAY_MS = 24 * 60 * 60 * 1000;

export function getPrescribeBlock(
  appointment: Pick<Appointment, "status" | "startsAt">,
  now = Date.now(),
): PrescribeBlock | null {
  if (appointment.status === "cancelled") return "cancelled";
  if (appointment.status === "no_show") return "no_show";
  const start = Date.parse(appointment.startsAt);
  if (start > now) return "not_started";
  if (now > start + PRESCRIBE_WINDOW_DAYS * DAY_MS) return "window_closed";
  return null;
}

export const prescribeBlockMessages: Record<PrescribeBlock, string> = {
  cancelled: "This appointment was cancelled, so it can't have a prescription.",
  no_show:
    "This appointment was marked as a no-show, so it can't have a prescription.",
  not_started:
    "You can write a prescription once the appointment has started, during or after the call.",
  window_closed: `Prescriptions can be written or edited up to ${PRESCRIBE_WINDOW_DAYS} days after the appointment. Ask the patient to book a follow-up.`,
};

// A medicine's course runs from the day the prescription was issued (clinic
// time) for `durationDays` days, or indefinitely when ongoing.
export type Course = {
  startKey: string;
  // Last day of the course; null when ongoing.
  endKey: string | null;
  // Days left including today; null when ongoing.
  daysLeft: number | null;
  finished: boolean;
  dueToday: boolean;
};

export function getCourse(
  item: PrescriptionItem,
  issuedAt: string,
  timezone: string,
  now: Date = new Date(),
): Course {
  const startKey = toDateKey(issuedAt, timezone);
  const todayKey = toDateKey(now, timezone);
  const endKey =
    item.durationDays === null
      ? null
      : addDaysToDateKey(startKey, item.durationDays - 1);
  const daysLeft =
    endKey === null ? null : daysBetweenDateKeys(todayKey, endKey) + 1;
  const finished = daysLeft !== null && daysLeft <= 0;
  const sinceStart = daysBetweenDateKeys(startKey, todayKey);

  const dueToday =
    !finished &&
    sinceStart >= 0 &&
    (item.frequency === "daily" ||
      (item.frequency === "weekly" && sinceStart % 7 === 0));

  return { startKey, endKey, daysLeft, finished, dueToday };
}

// What the patient sees: active prescriptions become "completed" once every
// medicine's course has ended.
export type PrescriptionDisplayStatus =
  "active" | "completed" | "cancelled" | "replaced";

export function getDisplayStatus(
  prescription: Prescription,
  now: Date = new Date(),
): PrescriptionDisplayStatus {
  if (prescription.status !== "active") return prescription.status;
  const running = prescription.items.some(
    (item) =>
      !getCourse(item, prescription.issuedAt, prescription.timezone, now)
        .finished,
  );
  return running ? "active" : "completed";
}

export type CurrentMedicine = {
  prescription: Prescription;
  item: PrescriptionItem;
  course: Course;
};

// Medicines from active prescriptions whose course hasn't ended, newest
// prescription first.
export function getCurrentMedicines(
  prescriptions: Prescription[],
  now: Date = new Date(),
): CurrentMedicine[] {
  return prescriptions
    .filter((prescription) => prescription.status === "active")
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
    .flatMap((prescription) =>
      prescription.items.map((item) => ({
        prescription,
        item,
        course: getCourse(
          item,
          prescription.issuedAt,
          prescription.timezone,
          now,
        ),
      })),
    )
    .filter(({ course }) => !course.finished);
}

// Appointment id -> the prescription to link from it: the active one, or
// else the latest cancelled one. Expects newest first.
export function prescriptionIdsByAppointment(prescriptions: Prescription[]) {
  const ids: Record<string, string> = {};
  for (const prescription of prescriptions) {
    if (prescription.status === "replaced") continue;
    if (!ids[prescription.appointmentId] || prescription.status === "active") {
      ids[prescription.appointmentId] = prescription.id;
    }
  }
  return ids;
}

const joinWords = (words: string[]) =>
  words.length <= 1
    ? (words[0] ?? "")
    : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;

// "Amoxicillin 500 mg"
export const medicineName = (
  item: Pick<PrescriptionItem, "medicine" | "strength">,
) => (item.strength ? `${item.medicine} ${item.strength}` : item.medicine);

// "1 tablet · Morning and night · After food"
export function describeDose(item: PrescriptionItem) {
  const when =
    item.frequency === "as_needed"
      ? "Only when needed"
      : `${item.frequency === "weekly" ? "Once a week: " : ""}${joinWords(
          item.doseTimes.map((time, index) =>
            index === 0
              ? doseTimeLabels[time]
              : doseTimeLabels[time].toLowerCase(),
          ),
        )}`;

  return [
    item.dose,
    when,
    item.meal === "any" ? null : mealTimingLabels[item.meal],
  ]
    .filter(Boolean)
    .join(" · ");
}

// "5 days", "1 day" or "Ongoing"
export function describeDuration(item: Pick<PrescriptionItem, "durationDays">) {
  if (item.durationDays === null) return "Ongoing";
  return item.durationDays === 1 ? "1 day" : `${item.durationDays} days`;
}
