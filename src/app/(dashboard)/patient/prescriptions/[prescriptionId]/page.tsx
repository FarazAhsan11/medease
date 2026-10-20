import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/shared/back-link";
import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { patientRoutes } from "@/config/routes";
import { PrescriptionDocument } from "@/features/prescriptions/components/prescription-document";
import { PrintButton } from "@/features/prescriptions/components/print-button";
import {
  getPrescription,
  getReplacementId,
} from "@/features/prescriptions/data/prescriptions";
import { requireRole } from "@/lib/auth/session";
import { formatDate } from "@/lib/datetime";

export const metadata: Metadata = {
  title: "Prescription",
};

export default async function PatientPrescriptionPage({
  params,
}: PageProps<"/patient/prescriptions/[prescriptionId]">) {
  const user = await requireRole("patient");
  const { prescriptionId } = await params;

  const prescription = await getPrescription(prescriptionId);
  if (!prescription || prescription.patientId !== user.id) notFound();
  const replacementId =
    prescription.status === "replaced"
      ? await getReplacementId(prescription.id)
      : null;

  return (
    <>
      <div className="grid gap-4 print:hidden">
        <BackLink href={patientRoutes.prescriptions}>
          Back to prescriptions
        </BackLink>
        <DashboardPageHeader
          title="Prescription"
          description={`From ${prescription.doctorName} on ${formatDate(prescription.issuedAt, prescription.timezone)}`}
          actions={<PrintButton />}
        />
      </div>
      <PrescriptionDocument
        prescription={prescription}
        viewer="patient"
        replacementHref={
          replacementId ? patientRoutes.prescription(replacementId) : null
        }
      />
    </>
  );
}
