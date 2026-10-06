import Link from "next/link";

import { BookingInfoBox } from "@/features/booking/components/booking-info-box";
import { BookingSelect } from "@/features/booking/components/booking-select";
import {
  getAvailableDates,
  getTimeSlots,
} from "@/features/booking/lib/schedule";
import type { Doctor } from "@/features/doctors/data/doctors";

type BookingPanelProps = {
  doctor: Doctor;
};

export function BookingPanel({ doctor }: BookingPanelProps) {
  return (
    <div className="flex w-full justify-center">
      <div className="w-[1000px] max-w-full rounded-[10px] bg-white p-[60px] font-roboto shadow-soft">
        <div className="flex items-center justify-between gap-5">
          <div className="flex items-center gap-[15px]">
            <div className="size-[100px] rounded-full bg-brand" />
            <div>
              <h1 className="text-2xl font-bold">
                {doctor.firstName} {doctor.lastName}
              </h1>
              <p className="mt-[5px] text-[18.72px]">{doctor.specialty}</p>
            </div>
          </div>
          <Link
            href="/find-doctor"
            aria-label="Close"
            className="my-[5px] text-lg text-ink-muted"
          >
            ✕
          </Link>
        </div>

        <h2 className="mt-5 mb-2.5 font-bold text-ink-muted">
          Laboratory Overview
        </h2>

        <div className="mb-5 flex gap-5 max-[759px]:flex-col">
          <BookingInfoBox
            title="Contact Information:"
            lines={[doctor.phone, doctor.email]}
          />
          <BookingInfoBox
            title="Hours of Operation"
            lines={["Mon-Sat,", "11 AM - 4 PM"]}
          />
        </div>

        <div className="mt-[15px] flex justify-around gap-5 max-[759px]:flex-col">
          <BookingSelect
            label="Select Date:"
            placeholder="Select Date"
            options={getAvailableDates()}
          />
          <BookingSelect
            label="Select Time:"
            placeholder="Select Time"
            options={getTimeSlots()}
            disabled
          />
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            className="w-fit rounded-[5px] bg-brand-sky px-5 py-2.5 font-sans text-[13.33px] text-white hover:bg-brand-sky-hover"
          >
            Book Appointment
          </button>
        </div>
      </div>
    </div>
  );
}
