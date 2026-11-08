import {
  FlaskConicalIcon,
  HouseIcon,
  MapPinIcon,
  PhoneIcon,
} from "lucide-react";

import { IconTile } from "@/components/shared/icon-tile";
import type { BookingLab } from "@/features/lab-booking/data/booking-options";
import type { CollectionArea } from "@/features/lab-booking/lib/lab-bookings";
import { formatFee, telHref } from "@/lib/format";

type BookingLabCardProps = {
  lab: BookingLab;
  areas: CollectionArea[];
  freeAbove: number | null;
};

// The lab being booked, beside the booking form.
export function BookingLabCard({ lab, areas, freeAbove }: BookingLabCardProps) {
  return (
    <aside className="h-fit space-y-4 rounded-2xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <IconTile icon={FlaskConicalIcon} />
        <div className="min-w-0">
          <h1 className="text-base font-semibold break-words">{lab.name}</h1>
          <p className="text-xs text-muted-foreground">Verified lab</p>
        </div>
      </div>
      <ul className="grid gap-2 text-sm text-muted-foreground">
        <li className="flex items-start gap-2">
          <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="break-words">{lab.address}</span>
        </li>
        <li className="flex items-center gap-2">
          <PhoneIcon className="size-4 shrink-0" aria-hidden />
          <a href={telHref(lab.phone)} className="hover:underline">
            {lab.phone}
          </a>
        </li>
      </ul>
      <div className="border-t pt-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <HouseIcon className="size-4" aria-hidden />
          Home collection
        </h2>
        {areas.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Not offered by this lab right now.
          </p>
        ) : (
          <>
            <ul className="mt-2 grid gap-1.5 text-sm">
              {areas.map((area) => (
                <li key={area.city}>
                  <div className="flex justify-between gap-3">
                    <span>{area.city}</span>
                    <span className="text-muted-foreground">
                      {area.fee === 0 ? "Free" : formatFee(area.fee)}
                    </span>
                  </div>
                  {area.note && (
                    <p className="text-xs text-muted-foreground">{area.note}</p>
                  )}
                </li>
              ))}
            </ul>
            {freeAbove !== null && (
              <p className="mt-2 text-xs text-muted-foreground">
                Free on orders of {formatFee(freeAbove)} or more.
              </p>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
