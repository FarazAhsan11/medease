import { CalendarOffIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/shared/back-link";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { patientRoutes } from "@/config/routes";
import { BookingForm } from "@/features/booking/components/booking-form";
import { DoctorProfileCard } from "@/features/booking/components/doctor-profile-card";
import { getBookingDays } from "@/features/booking/data/doctor-slots";
import {
  getDirectoryDoctor,
  getWeeklyHours,
} from "@/features/doctors/data/doctor-directory";

export async function generateMetadata({
  params,
}: PageProps<"/patient/find-doctor/[doctorId]">): Promise<Metadata> {
  const { doctorId } = await params;
  const doctor = await getDirectoryDoctor(doctorId);

  return { title: doctor ? `Book ${doctor.fullName}` : "Doctor not found" };
}

export default async function PatientBookDoctorPage({
  params,
}: PageProps<"/patient/find-doctor/[doctorId]">) {
  const { doctorId } = await params;
  const doctor = await getDirectoryDoctor(doctorId);
  if (!doctor) notFound();

  const [hours, days] = await Promise.all([
    getWeeklyHours(doctor.id),
    doctor.acceptingAppointments
      ? getBookingDays(doctor.id, doctor.timezone)
      : [],
  ]);

  return (
    <>
      <BackLink href={patientRoutes.findDoctor}>Back to doctors</BackLink>
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <DoctorProfileCard doctor={doctor} hours={hours} />
        {days.length > 0 ? (
          <BookingForm
            doctorId={doctor.id}
            fee={doctor.consultationFee}
            days={days}
          />
        ) : (
          <EmptyState
            icon={CalendarOffIcon}
            title={
              doctor.acceptingAppointments
                ? "No open slots in the next two weeks"
                : `${doctor.fullName} isn't taking bookings right now`
            }
            description="Check back soon, or find another doctor with the same specialty."
            action={
              <Link
                href={`${patientRoutes.findDoctor}?specialty=${encodeURIComponent(doctor.specialization)}`}
                className={buttonVariants()}
              >
                See other {doctor.specialization.toLowerCase()}s
              </Link>
            }
          />
        )}
      </div>
    </>
  );
}
