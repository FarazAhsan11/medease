import { FileTextIcon } from "lucide-react";
import Link from "next/link";

import { DetailList } from "@/components/shared/detail-list";
import { PanelCard } from "@/components/shared/panel-card";
import { doctorRoutes } from "@/config/routes";
import type { DoctorProfile } from "@/features/doctor-dashboard/data/doctor-profile";
import { VerificationStatusBadge } from "@/features/doctor-verification/components/verification-status-badge";
import { formatFee } from "@/lib/format";

type ProfileDetailsProps = {
  profile: DoctorProfile;
  email: string;
};

function DocumentLink({ url }: { url: string | null }) {
  if (!url) return "Not uploaded";

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-primary hover:underline"
    >
      <FileTextIcon className="size-3.5" aria-hidden />
      View file
    </a>
  );
}

export function ProfileDetails({ profile, email }: ProfileDetailsProps) {
  const sections = [
    {
      title: "Personal information",
      items: [
        {
          label: "Full name",
          value: `${profile.firstName} ${profile.lastName}`,
        },
        { label: "Age", value: `${profile.age} years` },
        { label: "Gender", value: profile.gender },
      ],
    },
    {
      title: "Contact",
      items: [
        { label: "Email", value: email },
        { label: "Phone", value: profile.phone },
      ],
    },
    {
      title: "Practice",
      items: [
        { label: "Specialization", value: profile.specialization },
        { label: "Experience", value: `${profile.experienceYears} years` },
        { label: "City", value: profile.city ?? "Not set" },
        { label: "Clinic", value: profile.clinicAddress },
        {
          label: "Consultation fee",
          value: formatFee(profile.consultationFee),
        },
      ],
    },
    {
      title: "Verification",
      items: [
        {
          label: "Status",
          value: (
            <Link href={doctorRoutes.verification}>
              <VerificationStatusBadge status={profile.verificationStatus} />
            </Link>
          ),
        },
        { label: "License number", value: profile.licenseNumber },
        {
          label: "PMDC license",
          value: <DocumentLink url={profile.licenseUrl} />,
        },
        {
          label: "Degree certificate",
          value: <DocumentLink url={profile.degreeUrl} />,
        },
      ],
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {profile.bio && (
        <PanelCard title="About" className="md:col-span-2">
          <p className="p-5 text-sm leading-relaxed text-muted-foreground">
            {profile.bio}
          </p>
        </PanelCard>
      )}
      {sections.map((section) => (
        <PanelCard key={section.title} title={section.title}>
          <div className="p-5">
            <DetailList items={section.items} />
          </div>
        </PanelCard>
      ))}
    </div>
  );
}
