import { filterFieldClass } from "@/features/doctors/lib/filter-styles";

type FilterSelectProps = {
  label: string;
  name: string;
  options: { value: string; label: string }[];
};

export function FilterSelect({ label, name, options }: FilterSelectProps) {
  return (
    <label className="mb-2.5 block text-sm text-ink-label">
      {label}:
      <select name={name} defaultValue="" className={filterFieldClass}>
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
