import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

type SelectOption = { value: string; label: string };

type SelectFieldProps = {
  id: string;
  name: string;
  label: string;
  options: readonly SelectOption[] | readonly string[];
  defaultValue?: string | null;
  // The first, empty choice: "Not specified" for optional fields, a prompt
  // such as "Select…" for required ones.
  emptyLabel?: string;
  hint?: string;
  error?: string;
};

const toOption = (option: SelectOption | string): SelectOption =>
  typeof option === "string" ? { value: option, label: option } : option;

export function SelectField({
  id,
  name,
  label,
  options,
  defaultValue,
  emptyLabel = "Not specified",
  hint,
  error,
}: SelectFieldProps) {
  return (
    <FormField id={id} label={label} hint={hint} error={error}>
      <NativeSelect
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="w-full"
        {...fieldErrorProps(id, error)}
      >
        <NativeSelectOption value="">{emptyLabel}</NativeSelectOption>
        {options.map(toOption).map(({ value, label: text }) => (
          <NativeSelectOption key={value} value={value}>
            {text}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </FormField>
  );
}
