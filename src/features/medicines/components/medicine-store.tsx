import { SignInPrompt } from "@/components/shared/sign-in-prompt";
import { patientRoutes } from "@/config/routes";
import { CartSummary } from "@/features/medicines/components/cart-summary";
import { MedicineCatalog } from "@/features/medicines/components/medicine-catalog";
import { PrescriptionUploadCard } from "@/features/medicines/components/prescription-upload-card";
import { medicines, sampleCart } from "@/features/medicines/data/medicines";

type MedicineStoreProps = {
  // Guests can browse the catalog but must log in to order.
  guest?: boolean;
};

export function MedicineStore({ guest = false }: MedicineStoreProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <MedicineCatalog medicines={medicines} guest={guest} />
      <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
        {guest ? (
          <SignInPrompt
            title="Log in to order"
            description="Upload a prescription, fill your cart, and check out once you're signed in."
            href={patientRoutes.medicines}
          />
        ) : (
          <>
            <PrescriptionUploadCard />
            <CartSummary items={sampleCart} />
          </>
        )}
      </aside>
    </div>
  );
}
