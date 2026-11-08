import Link from "next/link";

import { SelectableChip } from "@/components/shared/selectable-chip";
import { patientRoutes } from "@/config/routes";
import {
  formatAddress,
  type PatientAddress,
} from "@/features/addresses/lib/addresses";

type CollectionAddressPickerProps = {
  addresses: PatientAddress[];
  // Cities the lab collects in.
  cities: string[];
  value: string | null;
  onChange: (addressId: string) => void;
  error?: string;
};

export function CollectionAddressPicker({
  addresses,
  cities,
  value,
  onChange,
  error,
}: CollectionAddressPickerProps) {
  return (
    <fieldset
      className="min-w-0"
      aria-describedby={error ? "lab-booking-address-error" : undefined}
    >
      <legend className="text-sm font-medium">Collection address</legend>
      {addresses.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          You have no saved addresses yet.{" "}
          <Link
            href={patientRoutes.settings}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Add one in Settings
          </Link>
          , then come back to book.
        </p>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {addresses.map((address) => {
            const served = cities.includes(address.city);
            return (
              <SelectableChip
                key={address.id}
                active={value === address.id}
                onSelect={() => onChange(address.id)}
                disabled={!served}
                className="p-3 text-left"
              >
                <span className="block font-medium">{address.label}</span>
                <span className="block text-xs break-words opacity-80">
                  {formatAddress(address)}
                </span>
                {!served && (
                  <span className="mt-1 block text-xs">
                    This lab doesn&apos;t collect in {address.city}
                  </span>
                )}
              </SelectableChip>
            );
          })}
        </div>
      )}
      {error && (
        <p
          id="lab-booking-address-error"
          className="mt-2 text-xs text-destructive"
        >
          {error}
        </p>
      )}
    </fieldset>
  );
}
