import { FileTextIcon } from "lucide-react";

import { DetailList } from "@/components/shared/detail-list";
import { PanelCard } from "@/components/shared/panel-card";
import type { DoctorProfile } from "@/features/doctor-dashboard/data/dashboard";

type ProfileDetailsProps = {
  profile: DoctorProfile;
};

export function ProfileDetails({ profile }: ProfileDetailsProps) {
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
        { label: "Address", value: profile.address },
      ],
    },
    {
      title: "Contact",
      items: [
        { label: "Email", value: profile.email },
        { label: "Phone", value: profile.phone },
      ],
    },
    {
      title: "Professional",
      items: [
        { label: "Specialization", value: profile.specialization },
        { label: "License number", value: profile.licenseNumber },
      ],
    },
    {
      title: "Documents",
      items: [
        {
          label: "Degree certificate",
          value: (
            <a
              href="#"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <FileTextIcon className="size-3.5" aria-hidden />
              View PDF
            </a>
          ),
        },
      ],
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
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
