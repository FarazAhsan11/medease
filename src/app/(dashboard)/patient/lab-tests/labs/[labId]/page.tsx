import { FlaskConicalIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/shared/back-link";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { patientRoutes } from "@/config/routes";
import { getPatientAddresses } from "@/features/addresses/data/addresses";
import { getFamilyMembers } from "@/features/family/data/family-members";
import { familyMemberName } from "@/features/family/lib/family-members";
import { relationLabels } from "@/features/family/lib/relations";
import { BookingLabCard } from "@/features/lab-booking/components/booking-lab-card";
import { LabBookingForm } from "@/features/lab-booking/components/lab-booking-form";
import { getLabBookingOptions } from "@/features/lab-booking/data/booking-options";
import { itemKey } from "@/features/lab-booking/lib/lab-bookings";
import { onlinePaymentsEnabled } from "@/features/payments/lib/payment-provider.server";
import { requireRole } from "@/lib/auth/session";
import { searchParam } from "@/lib/directory-search";

export const metadata: Metadata = {
  title: "Book lab tests",
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export default async function PatientBookLabPage({
  params,
  searchParams,
}: PageProps<"/patient/lab-tests/labs/[labId]">) {
  const [{ labId }, query, user] = await Promise.all([
    params,
    searchParams,
    requireRole("patient"),
  ]);
  if (!isUuid(labId)) notFound();

  const [options, addresses, familyMembers] = await Promise.all([
    getLabBookingOptions(labId),
    getPatientAddresses(user.id),
    getFamilyMembers(user.id),
  ]);
  if (!options) notFound();

  // Start with what the patient picked, if this lab still offers it.
  const start = [
    itemKey("test", searchParam(query.test)),
    itemKey("package", searchParam(query.package)),
  ].filter((key) => options.items.some((item) => item.key === key));

  return (
    <>
      <BackLink href={patientRoutes.bookLabTests}>Back to lab tests</BackLink>
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <BookingLabCard
          lab={options.lab}
          areas={options.areas}
          freeAbove={options.freeAbove}
        />
        {options.items.length > 0 ? (
          <LabBookingForm
            labId={options.lab.id}
            items={options.items}
            initialSelected={start}
            areas={options.areas}
            freeAbove={options.freeAbove}
            collectionDays={options.collectionDays}
            visitDays={options.visitDays}
            addresses={addresses}
            recipients={familyMembers.map((member) => ({
              value: member.id,
              label: `${familyMemberName(member)} (${relationLabels[member.relation].toLowerCase()})`,
            }))}
            onlinePayments={onlinePaymentsEnabled()}
          />
        ) : (
          <EmptyState
            icon={FlaskConicalIcon}
            title="This lab has no tests listed right now"
            description="Compare other labs for the test you need."
            action={
              <Link
                href={patientRoutes.bookLabTests}
                className={buttonVariants()}
              >
                Find a lab test
              </Link>
            }
          />
        )}
      </div>
    </>
  );
}
