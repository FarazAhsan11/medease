import { FormField } from "@/components/shared/form-field";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AuthFooterLink } from "@/features/auth/components/auth-footer-link";
import { AuthSubmitLink } from "@/features/auth/components/auth-submit-link";
import { PasswordInput } from "@/features/auth/components/password-input";

const labServices = ["Home sample collection", "Online reports", "Open 24/7"];

export function LabRegisterForm() {
  return (
    <>
      <form className="grid gap-4">
        <FormField id="lab-name" label="Laboratory name">
          <Input
            id="lab-name"
            name="labName"
            placeholder="CityCare Diagnostics"
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField id="lab-registration" label="Registration no.">
            <Input
              id="lab-registration"
              name="registrationNumber"
              placeholder="LAB-00000"
            />
          </FormField>
          <FormField id="lab-contact" label="Contact person">
            <Input id="lab-contact" name="contactPerson" />
          </FormField>
        </div>
        <FormField id="lab-email" label="Work email">
          <Input
            id="lab-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="lab@example.com"
          />
        </FormField>
        <FormField id="lab-phone" label="Phone number">
          <Input id="lab-phone" name="phone" type="tel" autoComplete="tel" />
        </FormField>
        <FormField id="lab-address" label="Lab address">
          <Textarea id="lab-address" name="address" rows={2} />
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
        <FormField id="lab-password" label="Password">
          <PasswordInput
            id="lab-password"
            name="password"
            autoComplete="new-password"
          />
        </FormField>
        <AuthSubmitLink href="/lab">Register laboratory</AuthSubmitLink>
      </form>
      <AuthFooterLink
        prompt="Already registered?"
        href="/login/lab"
        label="Log in"
      />
    </>
  );
}
