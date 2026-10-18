"use client";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { signUpLab } from "@/features/auth/actions/sign-up";
import { AuthFooterLink } from "@/features/auth/components/auth-footer-link";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { PasswordInput } from "@/features/auth/components/password-input";
import { SignUpConfirmation } from "@/features/auth/components/sign-up-confirmation";
import { labServices } from "@/features/auth/data/registration-options";
import type { SignUpState } from "@/features/auth/schemas/sign-up";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

export function LabRegisterForm() {
  const { state, pending, onSubmit, fieldError } = useFormAction<SignUpState>(
    signUpLab,
    initialFormState,
  );

  if (state.confirmEmail) {
    return (
      <SignUpConfirmation email={state.confirmEmail} loginHref="/login/lab" />
    );
  }

  return (
    <>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <FormField
          id="lab-name"
          label="Laboratory name"
          error={fieldError("labName")}
        >
          <Input
            id="lab-name"
            name="labName"
            placeholder="CityCare Diagnostics"
            autoComplete="organization"
            required
            {...fieldErrorProps("lab-name", fieldError("labName"))}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            id="lab-registration"
            label="Registration no."
            error={fieldError("registrationNumber")}
          >
            <Input
              id="lab-registration"
              name="registrationNumber"
              placeholder="LAB-00000"
              required
              {...fieldErrorProps(
                "lab-registration",
                fieldError("registrationNumber"),
              )}
            />
          </FormField>
          <FormField
            id="lab-contact"
            label="Contact person"
            error={fieldError("contactPerson")}
          >
            <Input
              id="lab-contact"
              name="contactPerson"
              autoComplete="name"
              required
              {...fieldErrorProps("lab-contact", fieldError("contactPerson"))}
            />
          </FormField>
        </div>
        <FormField
          id="lab-email"
          label="Work email"
          error={fieldError("email")}
        >
          <Input
            id="lab-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="lab@example.com"
            required
            {...fieldErrorProps("lab-email", fieldError("email"))}
          />
        </FormField>
        <FormField
          id="lab-phone"
          label="Phone number"
          error={fieldError("phone")}
        >
          <Input
            id="lab-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            {...fieldErrorProps("lab-phone", fieldError("phone"))}
          />
        </FormField>
        <FormField
          id="lab-address"
          label="Lab address"
          error={fieldError("address")}
        >
          <Textarea
            id="lab-address"
            name="address"
            rows={2}
            required
            {...fieldErrorProps("lab-address", fieldError("address"))}
          />
        </FormField>
        <fieldset>
          <legend className="text-sm font-medium">Services offered</legend>
          <div className="mt-2 grid gap-2">
            {labServices.map((service) => (
              <label
                key={service}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Checkbox name="services" value={service} />
                {service}
              </label>
            ))}
          </div>
        </fieldset>
        <FormField
          id="lab-password"
          label="Password"
          hint="At least 8 characters."
          error={fieldError("password")}
        >
          <PasswordInput
            id="lab-password"
            name="password"
            autoComplete="new-password"
            required
            {...fieldErrorProps("lab-password", fieldError("password"))}
          />
        </FormField>
        <AuthSubmitButton pending={pending} pendingLabel="Registering…">
          Register laboratory
        </AuthSubmitButton>
      </form>
      <AuthFooterLink
        prompt="Already registered?"
        href="/login/lab"
        label="Log in"
      />
    </>
  );
}
