import { PanelCard } from "@/components/shared/panel-card";
import { Badge } from "@/components/ui/badge";
import { AddressSheet } from "@/features/addresses/components/address-sheet";
import { DeleteAddressDialog } from "@/features/addresses/components/delete-address-dialog";
import {
  formatAddress,
  MAX_ADDRESSES,
  MAX_STREET_ADDRESS,
  type PatientAddress,
} from "@/features/addresses/lib/addresses";

type AddressesCardProps = {
  addresses: PatientAddress[];
  // From the patient's profile: fills in a new address.
  accountPhone: string | null;
  homeAddress: string | null;
};

// Saved addresses for home sample collection and delivery (PRO-07).
export function AddressesCard({
  addresses,
  accountPhone,
  homeAddress,
}: AddressesCardProps) {
  const full = addresses.length >= MAX_ADDRESSES;
  const empty = addresses.length === 0;
  // The first address starts from the home address already on the profile,
  // when it fits the street box.
  const defaults: Partial<PatientAddress> = {
    contactPhone: accountPhone ?? "",
    ...(empty && homeAddress && homeAddress.length <= MAX_STREET_ADDRESS
      ? { label: "Home", streetAddress: homeAddress }
      : {}),
  };

  return (
    <PanelCard
      title="Addresses"
      description={
        full
          ? `You've saved the most allowed (${MAX_ADDRESSES}).`
          : "Where we collect samples at home."
      }
      action={
        <AddressSheet defaults={defaults} first={empty} disabled={full} />
      }
    >
      {empty ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          Save your home, your parents&apos; home or your office to book a home
          sample collection there.
        </p>
      ) : (
        <ul className="divide-y">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className="truncate">{address.label}</span>
                  {address.isDefault && (
                    <Badge variant="secondary">Default</Badge>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatAddress(address)}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <AddressSheet address={address} />
                <DeleteAddressDialog
                  addressId={address.id}
                  label={address.label}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </PanelCard>
  );
}
