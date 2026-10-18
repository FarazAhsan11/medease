import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/features/auth/components/password-input";

type AccountFieldsProps = {
  idPrefix: string;
  fieldError: (name: string) => string | undefined;
};

export function AccountFields({ idPrefix, fieldError }: AccountFieldsProps) {
  const ids = {
    firstName: `${idPrefix}-first-name`,
    lastName: `${idPrefix}-last-name`,
    email: `${idPrefix}-email`,
    phone: `${idPrefix}-phone`,
    password: `${idPrefix}-password`,
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <FormField
          id={ids.firstName}
          label="First name"
          error={fieldError("firstName")}
        >
          <Input
            id={ids.firstName}
            name="firstName"
            autoComplete="given-name"
            required
            {...fieldErrorProps(ids.firstName, fieldError("firstName"))}
          />
        </FormField>
        <FormField
          id={ids.lastName}
          label="Last name"
          error={fieldError("lastName")}
        >
          <Input
            id={ids.lastName}
            name="lastName"
            autoComplete="family-name"
            required
            {...fieldErrorProps(ids.lastName, fieldError("lastName"))}
          />
        </FormField>
      </div>
      <FormField id={ids.email} label="Email" error={fieldError("email")}>
        <Input
          id={ids.email}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          {...fieldErrorProps(ids.email, fieldError("email"))}
        />
      </FormField>
      <FormField
        id={ids.phone}
        label="Phone number"
        error={fieldError("phone")}
      >
        <Input
          id={ids.phone}
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+92 300 0000000"
          required
          {...fieldErrorProps(ids.phone, fieldError("phone"))}
        />
      </FormField>
      <FormField
        id={ids.password}
        label="Password"
        hint="At least 8 characters."
        error={fieldError("password")}
      >
        <PasswordInput
          id={ids.password}
          name="password"
          autoComplete="new-password"
          required
          {...fieldErrorProps(ids.password, fieldError("password"))}
        />
      </FormField>
    </>
  );
}
