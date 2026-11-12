"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DatePickerChips } from "@/components/shared/date-picker-chips";
import { SelectField } from "@/components/shared/select-field";
import type { PatientAddress } from "@/features/addresses/lib/addresses";
import { bookLabTest } from "@/features/lab-booking/actions/book-lab-test";
import { BookingItemPicker } from "@/features/lab-booking/components/booking-item-picker";
import { CollectionAddressPicker } from "@/features/lab-booking/components/collection-address-picker";
import { CollectionMethodPicker } from "@/features/lab-booking/components/collection-method-picker";
import { CollectionWindowPicker } from "@/features/lab-booking/components/collection-window-picker";
import { LabBookingSummary } from "@/features/lab-booking/components/lab-booking-summary";
import { PaymentMethodPicker } from "@/features/lab-booking/components/payment-method-picker";
import { useCollectionWindow } from "@/features/lab-booking/hooks/use-collection-window";
import {
  collectionFee,
  repeatedTests,
  staleBookingCodes,
  type BookableItem,
  type CollectionArea,
  type PaymentMethod,
} from "@/features/lab-booking/lib/lab-bookings";
import { useFormAction } from "@/hooks/use-form-action";
import { useRefreshOnVisible } from "@/hooks/use-refresh-on-visible";
import { initialFormState } from "@/lib/form-state";
import type { BookingDay, DateOption } from "@/lib/schedule";

type LabBookingFormProps = {
  labId: string;
  items: BookableItem[];
  // Keys of the items to start with, from the link that opened the page.
  initialSelected: string[];
  areas: CollectionArea[];
  freeAbove: number | null;
  collectionDays: BookingDay[];
  visitDays: DateOption[];
  addresses: PatientAddress[];
  // Family members the test can be for, besides the account holder.
  recipients: { value: string; label: string }[];
  // Who to start with, e.g. the person a doctor's order is for.
  initialRecipientId?: string | null;
  // The doctor's order this page was opened from (LAB-08). The database links
  // the booking to it only if it books ordered tests for the order's person.
  labOrderId?: string | null;
  // Whether patients can pay online (PAY-07); otherwise cash only.
  onlinePayments: boolean;
};

export function LabBookingForm({
  labId,
  items,
  initialSelected,
  areas,
  freeAbove,
  collectionDays,
  visitDays,
  addresses,
  recipients,
  initialRecipientId,
  labOrderId,
  onlinePayments,
}: LabBookingFormProps) {
  const router = useRouter();
  const cities = areas.map((area) => area.city);
  // One id per booking attempt: sending it again returns the same booking.
  const [requestId] = useState(() => crypto.randomUUID());
  const [selected, setSelected] = useState(initialSelected);
  const [method, setMethod] = useState<"lab" | "home">("lab");
  const [visitDate, setVisitDate] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentMethod>(
    onlinePayments ? "online" : "cash",
  );
  const selection = useCollectionWindow(collectionDays);
  const [addressId, setAddressId] = useState<string | null>(
    () =>
      (
        addresses.find(
          (address) => address.isDefault && cities.includes(address.city),
        ) ?? addresses.find((address) => cities.includes(address.city))
      )?.id ?? null,
  );
  const { state, pending, onSubmit, fieldError } = useFormAction(
    bookLabTest,
    initialFormState,
  );

  const chosen = items.filter((item) => selected.includes(item.key));
  const subtotal = chosen.reduce((sum, item) => sum + item.price, 0);
  const repeated = repeatedTests(chosen);

  const homeUnavailable =
    areas.length === 0
      ? "This lab doesn't collect at home."
      : chosen.some((item) => !item.homeCollection)
        ? "Not offered for every test you chose."
        : collectionDays.every((day) => day.openCount === 0)
          ? "No collection windows are open in the next two weeks."
          : null;
  const home = method === "home" && homeUnavailable === null;

  const chosenSlot = selection.slot;
  const address = addresses.find(
    (item) => item.id === addressId && cities.includes(item.city),
  );
  const area = areas.find((item) => item.city === address?.city);
  const fee = area ? collectionFee(subtotal, area, freeAbove) : null;

  const missing =
    chosen.length === 0
      ? "Choose at least one test."
      : repeated.length > 0
        ? `${repeated[0]} is in your booking twice. Remove one.`
        : home
          ? !address
            ? "Choose a collection address."
            : !chosenSlot
              ? "Pick a collection window."
              : null
          : !visitDate
            ? "Pick a day for your visit."
            : null;

  useEffect(() => {
    if (state.code && staleBookingCodes.has(state.code)) router.refresh();
  }, [state, router]);

  useRefreshOnVisible();

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      className="min-w-0 space-y-6 rounded-2xl border bg-card p-6"
      noValidate
    >
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="labId" value={labId} />
      <input type="hidden" name="labOrderId" value={labOrderId ?? ""} />
      <input type="hidden" name="collection" value={home ? "home" : "lab"} />
      <input
        type="hidden"
        name="visitDate"
        value={home ? "" : (visitDate ?? "")}
      />
      <input
        type="hidden"
        name="slotStartsAt"
        value={home ? (chosenSlot ?? "") : ""}
      />
      <input
        type="hidden"
        name="paymentMethod"
        value={onlinePayments ? payment : "cash"}
      />
      <input
        type="hidden"
        name="addressId"
        value={home ? (address?.id ?? "") : ""}
      />
      {chosen.map((item) => (
        <input
          key={item.key}
          type="hidden"
          name={item.kind === "test" ? "labTestIds" : "packageIds"}
          value={item.id}
        />
      ))}

      <div>
        <h2 className="text-lg font-semibold">Book lab tests</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your tests, then how and when the sample is taken. Times are in
          Pakistan time.
        </p>
      </div>

      <BookingItemPicker
        items={items}
        selected={selected}
        onToggle={(key, checked) =>
          setSelected((current) =>
            checked
              ? [...current, key]
              : current.filter((value) => value !== key),
          )
        }
        home={home}
        error={fieldError("items")}
      />

      <CollectionMethodPicker
        value={home ? "home" : "lab"}
        onChange={setMethod}
        homeUnavailable={homeUnavailable}
      />

      {home ? (
        <>
          <CollectionAddressPicker
            addresses={addresses}
            cities={cities}
            value={address?.id ?? null}
            onChange={setAddressId}
            error={fieldError("addressId")}
          />
          <CollectionWindowPicker
            days={collectionDays}
            selection={selection}
            error={fieldError("slotStartsAt")}
          />
        </>
      ) : (
        <div className="space-y-2">
          <DatePickerChips
            dates={visitDays}
            value={visitDate}
            onChange={(date) => setVisitDate(date.value)}
          />
          <p className="text-xs text-muted-foreground">
            {fieldError("visitDate") ??
              "Visit any time the lab is open that day."}
          </p>
        </div>
      )}

      {/* A doctor's order is for the person seen at the visit. */}
      {labOrderId ? (
        <input
          type="hidden"
          name="careRecipientId"
          value={initialRecipientId ?? ""}
        />
      ) : (
        recipients.length > 0 && (
          <SelectField
            id="lab-booking-careRecipientId"
            name="careRecipientId"
            label="Who is this test for?"
            emptyLabel="Myself"
            options={recipients}
            defaultValue={initialRecipientId}
            hint="The lab sees this person's name, age and sex for the report."
            error={fieldError("careRecipientId")}
          />
        )
      )}

      {onlinePayments && (
        <PaymentMethodPicker
          value={payment}
          onChange={setPayment}
          home={home}
        />
      )}

      <LabBookingSummary
        subtotal={subtotal}
        home={home}
        payOnline={onlinePayments && payment === "online"}
        collectionFee={fee}
        missing={missing}
        pending={pending}
      />
    </form>
  );
}
