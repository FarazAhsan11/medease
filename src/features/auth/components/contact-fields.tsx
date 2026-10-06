import { authFieldClass } from "@/features/auth/lib/field-styles";

export function ContactFields() {
  return (
    <>
      <input
        type="email"
        name="email"
        required
        aria-label="Email"
        placeholder="Email"
        className={authFieldClass}
      />
      <input
        type="tel"
        name="phone"
        required
        aria-label="Phone number"
        placeholder="Phone No."
        className={authFieldClass}
      />
    </>
  );
}
