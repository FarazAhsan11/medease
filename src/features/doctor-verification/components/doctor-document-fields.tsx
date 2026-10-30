import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";

type DoctorDocumentFieldsProps = {
  idPrefix: string;
  fieldError: (name: string) => string | undefined;
};

const fields = [
  {
    name: "profilePhoto",
    id: "photo",
    label: "Profile photo",
    hint: "JPG, PNG or WebP, up to 2 MB",
    accept: "image/jpeg,image/png,image/webp",
  },
  {
    name: "licenseDocument",
    id: "license",
    label: "PMDC license",
    hint: "PDF, JPG or PNG, up to 5 MB",
    accept: "application/pdf,image/jpeg,image/png",
  },
  {
    name: "degreeDocument",
    id: "degree",
    label: "Degree (PDF)",
    hint: "PDF, up to 5 MB",
    accept: "application/pdf",
  },
];

export function DoctorDocumentFields({
  idPrefix,
  fieldError,
}: DoctorDocumentFieldsProps) {
  return (
    <div className="grid gap-3">
      {fields.map((field) => {
        const id = `${idPrefix}-${field.id}`;
        const error = fieldError(field.name);

        return (
          <FormField
            key={field.name}
            id={id}
            label={field.label}
            hint={field.hint}
            error={error}
          >
            <Input
              id={id}
              name={field.name}
              type="file"
              accept={field.accept}
              {...fieldErrorProps(id, error)}
            />
          </FormField>
        );
      })}
    </div>
  );
}
