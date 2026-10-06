import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookingPanel } from "@/features/booking/components/booking-panel";
import { getDoctorById } from "@/features/doctors/data/doctors";

export async function generateMetadata({
  params,
}: PageProps<"/find-doctor/[doctorId]">): Promise<Metadata> {
  const { doctorId } = await params;
  const doctor = getDoctorById(doctorId);

  return {
    title: doctor
      ? `Book Dr. ${doctor.firstName} ${doctor.lastName}`
      : "Doctor not found",
  };
}

export default async function BookingPage({
  params,
}: PageProps<"/find-doctor/[doctorId]">) {
  const { doctorId } = await params;
  const doctor = getDoctorById(doctorId);

  if (!doctor) notFound();

  return <BookingPanel doctor={doctor} />;
}
