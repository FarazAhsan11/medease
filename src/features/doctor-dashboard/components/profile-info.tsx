import { InfoCard } from "@/features/doctor-dashboard/components/info-card";
import { InfoRow } from "@/features/doctor-dashboard/components/info-row";
import type { DoctorProfile } from "@/features/doctor-dashboard/data/dashboard";
import { profileButtonClass } from "@/features/doctor-dashboard/lib/profile-styles";

type ProfileInfoProps = {
  profile: DoctorProfile;
  onEdit: () => void;
};

export function ProfileInfo({ profile, onEdit }: ProfileInfoProps) {
  return (
    <div className="w-full rounded-xl bg-white p-8 shadow-soft">
      <div className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6 max-md:grid-cols-1">
        <InfoCard title="Personal Information">
          <InfoRow label="Full Name">
            {profile.firstName} {profile.lastName}
          </InfoRow>
          <InfoRow label="Age">{profile.age} years</InfoRow>
          <InfoRow label="Gender">{profile.gender}</InfoRow>
          <InfoRow label="Address">{profile.address}</InfoRow>
        </InfoCard>
        <InfoCard title="Contact Information">
          <InfoRow label="Email">{profile.email}</InfoRow>
          <InfoRow label="Phone">{profile.phone}</InfoRow>
        </InfoCard>
        <InfoCard title="Professional Information">
          <InfoRow label="Specialization">{profile.specialization}</InfoRow>
          <InfoRow label="License Number">{profile.licenseNumber}</InfoRow>
          <InfoRow label="Member Since">{profile.memberSince}</InfoRow>
        </InfoCard>
        <InfoCard title="Documents">
          <InfoRow label="Degree Document">
            <a
              href="#"
              className="rounded bg-link-soft px-[0.8rem] py-[0.3rem] font-medium text-link transition-all duration-300 hover:bg-link hover:text-white"
            >
              📄 View Certificate
            </a>
          </InfoRow>
        </InfoCard>
      </div>
      <button type="button" onClick={onEdit} className={profileButtonClass}>
        ✏️ Edit Profile
      </button>
    </div>
  );
}
