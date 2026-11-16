import { MapPinIcon, PhoneIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { LabBooking } from "@/features/lab-booking/lib/lab-bookings";
import { mapsHref } from "@/features/lab-collections/lib/collections";
import { telHref } from "@/lib/format";

type CollectionAddressProps = {
  address: NonNullable<LabBooking["address"]>;
};

// Where to go and who to call, with large tap targets for a phone.
export function CollectionAddress({ address }: CollectionAddressProps) {
  return (
    <div className="grid gap-3">
      <address className="text-sm not-italic">
        <span className="block break-words">{address.streetAddress}</span>
        <span className="block break-words">
          {address.area}, {address.city}
        </span>
        {address.landmark && (
          <span className="block text-xs break-words text-muted-foreground">
            Near {address.landmark}
          </span>
        )}
        <span className="mt-1 block text-xs text-muted-foreground">
          {address.contactName
            ? `Ask for ${address.contactName} · ${address.contactPhone}`
            : address.contactPhone}
        </span>
      </address>
      <div className="grid grid-cols-2 gap-2">
        <a
          href={telHref(address.contactPhone)}
          className={buttonVariants({ variant: "outline", className: "h-10" })}
        >
          <PhoneIcon aria-hidden />
          Call
        </a>
        <a
          href={mapsHref(address)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", className: "h-10" })}
        >
          <MapPinIcon aria-hidden />
          Map
        </a>
      </div>
    </div>
  );
}
