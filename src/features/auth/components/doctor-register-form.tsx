import { AuthFooterLink } from "@/features/auth/components/auth-footer-link";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { ContactFields } from "@/features/auth/components/contact-fields";
import { NameFields } from "@/features/auth/components/name-fields";
import { PasswordInput } from "@/features/auth/components/password-input";
import { genders, specializations } from "@/features/auth/data/specializations";
import { authFieldClass } from "@/features/auth/lib/field-styles";
import { fileInputClass } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

const selectClass = cn(authFieldClass, "text-black");

export function DoctorRegisterForm() {
  return (
    <>
      <form>
        <NameFields />
        <textarea
          name="address"
          required
          aria-label="Address"
          placeholder="Enter address"
          className={cn(authFieldClass, "max-w-[300px] font-mono text-[13px]")}
        />
        <input
          type="number"
          name="age"
          required
          aria-label="Age"
          placeholder="Enter age"
          className={authFieldClass}
        />
        <select
          name="gender"
          required
          aria-label="Gender"
          defaultValue=""
          className={selectClass}
        >
          <option value="">Select gender</option>
          {genders.map((gender) => (
            <option key={gender}>{gender}</option>
          ))}
        </select>
        <ContactFields />
        <PasswordInput />
        <select
          name="specialization"
          required
          aria-label="Specialization"
          className={selectClass}
        >
          {specializations.map((specialization) => (
            <option key={specialization}>{specialization}</option>
          ))}
        </select>
        <input
          type="text"
          name="licenseNumber"
          required
          aria-label="License number"
          placeholder="License Number"
          className={authFieldClass}
        />
        <input
          type="file"
          name="profilePhoto"
          accept="image/*"
          required
          aria-label="Profile photo"
          className={cn(authFieldClass, fileInputClass)}
        />
        <input
          type="file"
          name="degreeDocument"
          accept="application/pdf"
          required
          aria-label="Degree document"
          className={cn(authFieldClass, fileInputClass)}
        />
        <AuthSubmitButton>Create account</AuthSubmitButton>
      </form>
      <AuthFooterLink
        prompt="Already have an account?"
        href="/login"
        label="Login here"
      />
    </>
  );
}
