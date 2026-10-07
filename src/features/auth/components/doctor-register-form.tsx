import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { AccountFields } from "@/features/auth/components/account-fields";
import { AuthFooterLink } from "@/features/auth/components/auth-footer-link";
import { AuthSubmitLink } from "@/features/auth/components/auth-submit-link";
import { genders, specializations } from "@/features/auth/data/specializations";

export function DoctorRegisterForm() {
  return (
    <>
      <form className="grid gap-4">
        <AccountFields idPrefix="doctor" />

        <div className="grid grid-cols-2 gap-3">
          <FormField id="doctor-age" label="Age">
            <Input id="doctor-age" name="age" type="number" min={21} />
          </FormField>
          <FormField id="doctor-gender" label="Gender">
            <NativeSelect id="doctor-gender" name="gender" className="w-full">
              <NativeSelectOption value="">Select</NativeSelectOption>
              {genders.map((gender) => (
                <NativeSelectOption key={gender} value={gender}>
                  {gender}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
        </div>

        <FormField id="doctor-specialization" label="Specialization">
          <NativeSelect
            id="doctor-specialization"
            name="specialization"
            className="w-full"
          >
            {specializations.map((specialization) => (
              <NativeSelectOption key={specialization} value={specialization}>
                {specialization}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>

        <FormField id="doctor-license" label="License number">
          <Input
            id="doctor-license"
            name="licenseNumber"
            placeholder="PMC-00000"
          />
        </FormField>

        <FormField id="doctor-address" label="Clinic address">
          <Textarea id="doctor-address" name="address" rows={2} />
        </FormField>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id="doctor-photo" label="Profile photo">
            <Input
              id="doctor-photo"
              name="profilePhoto"
              type="file"
              accept="image/*"
            />
          </FormField>
          <FormField id="doctor-degree" label="Degree (PDF)">
            <Input
              id="doctor-degree"
              name="degreeDocument"
              type="file"
              accept="application/pdf"
            />
          </FormField>
        </div>

        <AuthSubmitLink href="/doctor">Create doctor account</AuthSubmitLink>
      </form>
      <AuthFooterLink
        prompt="Already registered?"
        href="/login/doctor"
        label="Log in"
      />
    </>
  );
}
