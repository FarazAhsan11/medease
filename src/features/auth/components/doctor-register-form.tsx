"use client";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { signUpDoctor } from "@/features/auth/actions/sign-up";
import { AccountFields } from "@/features/auth/components/account-fields";
import { AuthFooterLink } from "@/features/auth/components/auth-footer-link";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { SignUpConfirmation } from "@/features/auth/components/sign-up-confirmation";
import {
  genders,
  specializations,
} from "@/features/auth/data/registration-options";
import type { SignUpState } from "@/features/auth/schemas/sign-up";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

export function DoctorRegisterForm() {
  const { state, pending, onSubmit, fieldError } = useFormAction<SignUpState>(
    signUpDoctor,
    initialFormState,
  );

  if (state.confirmEmail) {
    return (
      <SignUpConfirmation
        email={state.confirmEmail}
        loginHref="/login/doctor"
      />
    );
  }

  return (
    <>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <AccountFields idPrefix="doctor" fieldError={fieldError} />

        <div className="grid grid-cols-2 gap-3">
          <FormField id="doctor-age" label="Age" error={fieldError("age")}>
            <Input
              id="doctor-age"
              name="age"
              type="number"
              min={21}
              max={100}
              required
              {...fieldErrorProps("doctor-age", fieldError("age"))}
            />
          </FormField>
          <FormField
            id="doctor-gender"
            label="Gender"
            error={fieldError("gender")}
          >
            <NativeSelect
              id="doctor-gender"
              name="gender"
              className="w-full"
              required
              {...fieldErrorProps("doctor-gender", fieldError("gender"))}
            >
              <NativeSelectOption value="">Select</NativeSelectOption>
              {genders.map((gender) => (
                <NativeSelectOption key={gender} value={gender}>
                  {gender}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
        </div>

        <FormField
          id="doctor-specialization"
          label="Specialization"
          error={fieldError("specialization")}
        >
          <NativeSelect
            id="doctor-specialization"
            name="specialization"
            className="w-full"
            required
            {...fieldErrorProps(
              "doctor-specialization",
              fieldError("specialization"),
            )}
          >
            {specializations.map((specialization) => (
              <NativeSelectOption key={specialization} value={specialization}>
                {specialization}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>

        <FormField
          id="doctor-license"
          label="License number"
          error={fieldError("licenseNumber")}
        >
          <Input
            id="doctor-license"
            name="licenseNumber"
            placeholder="PMC-00000"
            required
            {...fieldErrorProps("doctor-license", fieldError("licenseNumber"))}
          />
        </FormField>

        <FormField
          id="doctor-address"
          label="Clinic address"
          error={fieldError("address")}
        >
          <Textarea
            id="doctor-address"
            name="address"
            rows={2}
            required
            {...fieldErrorProps("doctor-address", fieldError("address"))}
          />
        </FormField>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            id="doctor-photo"
            label="Profile photo"
            hint="Optional · JPG, PNG or WebP, up to 2 MB"
            error={fieldError("profilePhoto")}
          >
            <Input
              id="doctor-photo"
              name="profilePhoto"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              {...fieldErrorProps("doctor-photo", fieldError("profilePhoto"))}
            />
          </FormField>
          <FormField
            id="doctor-degree"
            label="Degree (PDF)"
            hint="Optional · PDF, up to 5 MB"
            error={fieldError("degreeDocument")}
          >
            <Input
              id="doctor-degree"
              name="degreeDocument"
              type="file"
              accept="application/pdf"
              {...fieldErrorProps(
                "doctor-degree",
                fieldError("degreeDocument"),
              )}
            />
          </FormField>
        </div>

        <AuthSubmitButton pending={pending} pendingLabel="Creating account…">
          Create doctor account
        </AuthSubmitButton>
      </form>
      <AuthFooterLink
        prompt="Already registered?"
        href="/login/doctor"
        label="Log in"
      />
    </>
  );
}
