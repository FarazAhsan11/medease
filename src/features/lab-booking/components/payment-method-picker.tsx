import { BanknoteIcon, CreditCardIcon } from "lucide-react";

import { SelectableChip } from "@/components/shared/selectable-chip";
import {
  PAYMENT_HOLD_MINUTES,
  type PaymentMethod,
} from "@/features/lab-booking/lib/lab-bookings";

type PaymentMethodPickerProps = {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  home: boolean;
};

// Shown only while online payment is on (PAY-07).
export function PaymentMethodPicker({
  value,
  onChange,
  home,
}: PaymentMethodPickerProps) {
  const options = [
    {
      value: "online" as const,
      icon: CreditCardIcon,
      title: "Pay online now",
      description: `On a secure payment page. Your booking is held for ${PAYMENT_HOLD_MINUTES} minutes while you pay.`,
    },
    {
      value: "cash" as const,
      icon: BanknoteIcon,
      title: "Pay in cash",
      description: home ? "Pay the collector at your door." : "Pay at the lab.",
    },
  ];

  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-medium">
        How would you like to pay?
      </legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <SelectableChip
            key={option.value}
            active={value === option.value}
            onSelect={() => onChange(option.value)}
            className="flex items-start gap-3 p-3 text-left"
          >
            <option.icon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <span className="block font-medium">{option.title}</span>
              <span className="block text-xs opacity-80">
                {option.description}
              </span>
            </span>
          </SelectableChip>
        ))}
      </div>
    </fieldset>
  );
}
