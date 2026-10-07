import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/shared/back-link";
import { patientRoutes } from "@/config/routes";
import { BookingForm } from "@/features/booking/components/booking-form";
import { DoctorProfileCard } from "@/features/booking/components/doctor-profile-card";
import { getDoctorById } from "@/features/doctors/data/doctors";
import { getAvailableDates, getTimeSlots } from "@/lib/schedule";

export async function generateMetadata({
  params,
}: PageProps<"/patient/find-doctor/[doctorId]">): Promise<Metadata> {
  const { doctorId } = await params;
  const doctor = getDoctorById(doctorId);

  return { title: doctor ? `Book ${doctor.name}` : "Doctor not found" };
}

export default async function PatientBookDoctorPage({
  params,
}: PageProps<"/patient/find-doctor/[doctorId]">) {
  const { doctorId } = await params;
  const doctor = getDoctorById(doctorId);

  if (!doctor) notFound();

  return (
    <>
      <BackLink href={patientRoutes.findDoctor}>Back to doctors</BackLink>
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <DoctorProfileCard doctor={doctor} />
        <BookingForm dates={getAvailableDates()} timeSlots={getTimeSlots()} />
      </div>
    </>
  );
}
