import Image from "next/image";

import { FilterSelect } from "@/features/doctors/components/filter-select";
import { filterFieldClass } from "@/features/doctors/lib/filter-styles";

const typeOptions = [
  "General Practitioner",
  "Cardiologist",
  "Neurologist",
  "Dermatologist",
].map((type) => ({ value: type, label: type }));

const genderOptions = ["Male", "Female"].map((gender) => ({
  value: gender,
  label: gender,
}));

const ratingOptions = [
  { value: "4", label: "4+" },
  { value: "4.5", label: "4.5+" },
];

const weekDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function DoctorFilters() {
  return (
    <aside className="flex w-1/4 flex-col gap-5 rounded-[15px] bg-surface-filter p-5 shadow-filter max-[1400px]:mr-[30px] max-[1400px]:mb-5 max-[1400px]:w-[40%] max-[480px]:p-2.5 max-md:w-full">
      <div className="flex w-1/2 items-center justify-center rounded-lg bg-surface-filter-head max-md:h-12 max-md:w-[40%]">
        <h2 className="mt-4 mb-5 text-xl font-bold text-white">Filters</h2>
        <Image
          src="/images/filter.svg"
          alt=""
          width={32}
          height={32}
          className="size-8 max-md:size-6"
        />
      </div>

      <form>
        <FilterSelect
          label="Type of Doctor"
          name="type"
          options={typeOptions}
        />
        <label className="mb-2.5 block text-sm text-ink-label">
          Location:
          <input
            type="text"
            name="location"
            placeholder="Enter location"
            className={filterFieldClass}
          />
        </label>
        <FilterSelect label="Gender" name="gender" options={genderOptions} />
        <FilterSelect label="Rating" name="rating" options={ratingOptions} />

        <h3 className="mb-2.5 text-base font-bold text-ink-body">
          Availability:
        </h3>
        <div className="flex flex-wrap gap-2.5">
          {weekDays.map((day) => (
            <label key={day} className="flex text-sm text-ink-label">
              {day}:
              <input
                type="checkbox"
                name={day.toLowerCase()}
                className="mx-1 mb-[15px] size-[13px]"
              />
            </label>
          ))}
        </div>
      </form>
    </aside>
  );
}
