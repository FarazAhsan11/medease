import { PillIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { patientRoutes } from "@/config/routes";
import { CurrentMedicineCard } from "@/features/prescriptions/components/current-medicine-card";
import { PrescriptionSummaryCard } from "@/features/prescriptions/components/prescription-summary-card";
import {
  getCurrentMedicines,
  type Prescription,
} from "@/features/prescriptions/lib/prescriptions";

type PatientPrescriptionsProps = {
  prescriptions: Prescription[];
};

export function PatientPrescriptions({
  prescriptions,
}: PatientPrescriptionsProps) {
  if (prescriptions.length === 0) {
    return (
      <EmptyState
        icon={PillIcon}
        title="No prescriptions yet"
        description="When a doctor prescribes medicines after a consultation, they'll appear here."
        action={
          <Link href={patientRoutes.findDoctor} className={buttonVariants()}>
            Find a doctor
          </Link>
        }
      />
    );
  }

  const current = getCurrentMedicines(prescriptions);

  return (
    <>
      <section className="grid gap-3">
        <h2 className="text-base font-semibold">Current medicines</h2>
        {current.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {current.map((medicine) => (
              <CurrentMedicineCard key={medicine.item.id} medicine={medicine} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed bg-card px-5 py-6 text-sm text-muted-foreground">
            None of your prescribed medicines are current right now.
          </p>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="text-base font-semibold">All prescriptions</h2>
        {prescriptions.map((prescription) => (
          <PrescriptionSummaryCard
            key={prescription.id}
            prescription={prescription}
            href={patientRoutes.prescription(prescription.id)}
          />
        ))}
      </section>
    </>
  );
}
