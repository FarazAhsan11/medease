"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type AppointmentsViewProps = {
  upcoming: ReactNode;
  past: ReactNode;
};

export function AppointmentsView({ upcoming, past }: AppointmentsViewProps) {
  const [showUpcoming, setShowUpcoming] = useState(true);

  return (
    <div className="bg-surface p-5">
      <div className="mb-5 flex items-center justify-between px-[70px] max-md:flex-col max-md:px-5">
        <h1 className="my-4 text-2xl font-bold text-ink-body max-md:text-xl">
          Appointments
        </h1>
        <div className="w-[120px] max-md:w-full">
          <button
            type="button"
            onClick={() => setShowUpcoming((value) => !value)}
            className={cn(
              "w-[119px] rounded-[30px] border-2 border-line-input px-5 py-2 text-base font-semibold text-white transition-colors duration-300 max-md:w-full max-md:px-4 max-md:text-sm",
              showUpcoming ? "bg-brand" : "bg-black",
            )}
          >
            {showUpcoming ? "Upcoming" : "Past"}
          </button>
        </div>
      </div>

      <section className="mx-[90px] flex flex-col items-center gap-5 rounded-[15px] p-5 max-md:mx-0">
        <h2 className="mt-[13px] mb-5 w-full pl-[100px] text-base font-bold text-ink-label max-md:pl-0">
          {showUpcoming ? "Upcoming Appointments" : "Past Appointments"}
        </h2>
        {showUpcoming ? upcoming : past}
      </section>
    </div>
  );
}
