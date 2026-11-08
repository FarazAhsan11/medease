// A patient's saved addresses for home collection and delivery (PRO-07). Safe
// to import from client components. Design: docs/addresses.md.

// Match the limit in save_patient_address and the check on street_address.
export const MAX_ADDRESSES = 10;
export const MAX_STREET_ADDRESS = 200;

export type PatientAddress = {
  id: string;
  label: string;
  streetAddress: string;
  area: string;
  city: string;
  landmark: string | null;
  contactName: string | null;
  contactPhone: string;
  isDefault: boolean;
};

export type PatientAddressRow = {
  id: string;
  label: string;
  street_address: string;
  area: string;
  city: string;
  landmark: string | null;
  contact_name: string | null;
  contact_phone: string;
  is_default: boolean;
};

export const ADDRESS_COLUMNS =
  "id, label, street_address, area, city, landmark, contact_name, contact_phone, is_default";

export const toPatientAddress = (row: PatientAddressRow): PatientAddress => ({
  id: row.id,
  label: row.label,
  streetAddress: row.street_address,
  area: row.area,
  city: row.city,
  landmark: row.landmark,
  contactName: row.contact_name,
  contactPhone: row.contact_phone,
  isDefault: row.is_default,
});

// One line for lists and pickers: "House 21, Street 5, G-10/2, Islamabad".
export const formatAddress = (address: PatientAddress) =>
  [address.streetAddress.replace(/\s*\n\s*/g, ", "), address.area, address.city]
    .filter(Boolean)
    .join(", ");

export const addressErrorMessages = {
  not_patient: "Only patients can save addresses.",
  invalid_address: "Some of these details aren't valid. Please check them.",
  too_many_addresses: `You can save up to ${MAX_ADDRESSES} addresses.`,
  address_not_found: "That address is no longer on your account.",
};
