import { ShoppingBagIcon, TruckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DELIVERY_FEE,
  getMedicineById,
  type CartItem,
} from "@/features/medicines/data/medicines";
import { formatFee } from "@/lib/format";

type CartSummaryProps = {
  items: CartItem[];
};

export function CartSummary({ items }: CartSummaryProps) {
  const lines = items.flatMap((item) => {
    const medicine = getMedicineById(item.medicineId);
    return medicine ? [{ ...item, medicine }] : [];
  });
  const subtotal = lines.reduce(
    (total, line) => total + line.medicine.price * line.quantity,
    0,
  );

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <ShoppingBagIcon className="size-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold">Your cart</h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {lines.length} items
        </span>
      </div>

      <ul className="mt-4 grid gap-3 border-b pb-4">
        {lines.map((line) => (
          <li key={line.medicineId} className="flex justify-between gap-3">
            <div>
              <p className="text-sm font-medium">
                {line.medicine.name} {line.medicine.strength}
              </p>
              <p className="text-xs text-muted-foreground">
                Qty {line.quantity} · {line.medicine.packSize}
              </p>
            </div>
            <p className="text-sm">
              {formatFee(line.medicine.price * line.quantity)}
            </p>
          </li>
        ))}
      </ul>

      <dl className="mt-4 grid gap-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd>{formatFee(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Delivery</dt>
          <dd>{formatFee(DELIVERY_FEE)}</dd>
        </div>
        <div className="flex justify-between border-t pt-2 font-semibold">
          <dt>Total</dt>
          <dd>{formatFee(subtotal + DELIVERY_FEE)}</dd>
        </div>
      </dl>

      <Button type="button" className="mt-5 h-9 w-full">
        Checkout
      </Button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <TruckIcon className="size-3.5" aria-hidden />
        Delivered within 24 hours
      </p>
    </div>
  );
}
