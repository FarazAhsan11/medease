import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { BookingForm } from "@/features/booking/components/booking-form";
import { DoctorProfileCard } from "@/features/booking/components/doctor-profile-card";
import { getAvailableDates, getTimeSlots } from "@/lib/schedule";
import { getDoctorById } from "@/features/doctors/data/doctors";

export async function generateMetadata({
  params,
}: PageProps<"/find-doctor/[doctorId]">): Promise<Metadata> {
  const { doctorId } = await params;
  const doctor = getDoctorById(doctorId);

  return { title: doctor ? `Book ${doctor.name}` : "Doctor not found" };
}

export default async function BookingPage({
  params,
}: PageProps<"/find-doctor/[doctorId]">) {
  const { doctorId } = await params;
  const doctor = getDoctorById(doctorId);

  if (!doctor) notFound();

  return (
    <Container className="py-8">
      <Link
        href="/find-doctor"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />
        Back to doctors
      </Link>
      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <DoctorProfileCard doctor={doctor} />
        <BookingForm dates={getAvailableDates()} timeSlots={getTimeSlots()} />
      </div>
    </Container>
  );
}
