import Image from "next/image";

type ProfilePhotoCardProps = {
  name: string;
  specialization: string;
  editing: boolean;
};

export function ProfilePhotoCard({
  name,
  specialization,
  editing,
}: ProfilePhotoCardProps) {
  return (
    <div className="h-fit min-w-[250px] rounded-xl bg-white p-8 text-center shadow-soft">
      <Image
        src="/images/doctor-avatar.png"
        alt="Doctor profile"
        width={150}
        height={150}
        className="mx-auto mb-4 size-[150px] rounded-full border-4 border-link object-cover"
      />
      {editing && (
        <label className="cursor-pointer text-ink-body">
          📷 Change Photo
          <input type="file" accept="image/*" className="sr-only" />
        </label>
      )}
      <h3 className="mt-4 mb-2 text-2xl font-bold text-ink-body">{name}</h3>
      <p className="text-[1.1rem] font-semibold text-link">{specialization}</p>
    </div>
  );
}
