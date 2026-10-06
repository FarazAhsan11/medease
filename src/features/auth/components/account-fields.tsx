import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/features/auth/components/password-input";

type AccountFieldsProps = {
  idPrefix: string;
};

export function AccountFields({ idPrefix }: AccountFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <FormField id={`${idPrefix}-first-name`} label="First name">
          <Input
            id={`${idPrefix}-first-name`}
            name="firstName"
            autoComplete="given-name"
          />
        </FormField>
        <FormField id={`${idPrefix}-last-name`} label="Last name">
          <Input
            id={`${idPrefix}-last-name`}
            name="lastName"
            autoComplete="family-name"
          />
        </FormField>
      </div>
      <FormField id={`${idPrefix}-email`} label="Email">
        <Input
          id={`${idPrefix}-email`}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
        />
      </FormField>
      <FormField id={`${idPrefix}-phone`} label="Phone number">
        <Input
          id={`${idPrefix}-phone`}
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+92 300 0000000"
        />
      </FormField>
      <FormField
        id={`${idPrefix}-password`}
        label="Password"
        hint="At least 8 characters."
      >
        <PasswordInput
          id={`${idPrefix}-password`}
          name="password"
          autoComplete="new-password"
        />
      </FormField>
    </>
  );
}
