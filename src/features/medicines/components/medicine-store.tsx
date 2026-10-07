import { CartSummary } from "@/features/medicines/components/cart-summary";
import { MedicineCatalog } from "@/features/medicines/components/medicine-catalog";
import { PrescriptionUploadCard } from "@/features/medicines/components/prescription-upload-card";
import { medicines, sampleCart } from "@/features/medicines/data/medicines";

export function MedicineStore() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <MedicineCatalog medicines={medicines} />
      <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
        <PrescriptionUploadCard />
        <CartSummary items={sampleCart} />
      </aside>
    </div>
  );
}
