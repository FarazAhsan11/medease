import Image from "next/image";
import Link from "next/link";

import type { Doctor } from "@/features/doctors/data/doctors";

type DoctorCardProps = {
  doctor: Doctor;
};

export function DoctorCard({ doctor }: DoctorCardProps) {
  const name = `Dr. ${doctor.firstName} ${doctor.lastName}`;

  return (
    <article className="flex h-[60vh] w-[360px] flex-col gap-2.5 rounded-[10px] bg-white p-[15px] shadow-soft max-[480px]:p-2.5 max-md:h-[50vh] max-md:w-full">
      <div className="flex flex-col gap-[15px]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Image
              src="/images/doctor-avatar.png"
              alt={`${name} profile`}
              width={80}
              height={87}
              className="h-[87px] w-20 rounded-full bg-brand-tint max-[480px]:size-[50px] max-md:size-[60px]"
            />
            <div className="flex flex-col justify-center">
              <h3 className="mb-2 text-xl font-bold">{name}</h3>
              <span className="text-base font-[550]">{doctor.specialty}</span>
              <p className="my-[5px] text-ink-muted">📞 {doctor.phone}</p>
            </div>
          </div>
          <div className="flex h-[30px] w-[60px] items-center justify-center gap-0.5 rounded-[20px] bg-surface font-bold">
            <Image
              src="/images/star-rating.svg"
              alt=""
              width={13}
              height={13}
            />
            <span>{doctor.rating}</span>
          </div>
        </div>

        <div className="flex flex-col text-ink-muted">
          <p className="my-[5px]">
            Location:
            <span className="block font-bold">{doctor.location}</span>
          </p>
          <p className="my-[5px]">
            Experience:
            <span className="block font-bold">{doctor.experience}</span>
          </p>
          <div className="flex items-center justify-between text-sm">
            <p className="my-[5px]">
              Consultation Fee:
              <span className="block font-bold">
                PK {doctor.consultationFee}
              </span>
            </p>
            {doctor.availableNow && (
              <span className="rounded-lg bg-success-soft p-2.5 font-bold text-success">
                Available Now
              </span>
            )}
          </div>
        </div>
      </div>

      <Link
        href={`/find-doctor/${doctor.id}`}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-strong px-5 py-2.5 text-base font-semibold text-white hover:bg-brand-strong-hover max-[480px]:p-2 max-[480px]:text-xs max-md:h-auto max-md:text-sm"
      >
        Book Appointment
        <Image src="/images/chevron-left.svg" alt="" width={24} height={25} />
      </Link>
    </article>
  );
}
