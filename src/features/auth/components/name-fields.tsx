import { authFieldClass } from "@/features/auth/lib/field-styles";

export function NameFields() {
  return (
    <div className="mb-4 grid grid-cols-2 gap-4">
      <input
        type="text"
        name="firstName"
        required
        aria-label="First name"
        placeholder="First Name"
        className={authFieldClass}
      />
      <input
        type="text"
        name="lastName"
        required
        aria-label="Last name"
        placeholder="Last Name"
        className={authFieldClass}
      />
    </div>
  );
}
