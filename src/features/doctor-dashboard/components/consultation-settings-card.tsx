import { FormField } from "@/components/shared/form-field";
import { PanelCard } from "@/components/shared/panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { slotDurations } from "@/features/doctor-dashboard/data/availability";

const consultationModes = [
  { id: "mode-video", label: "Video consultations", enabled: true },
  { id: "mode-clinic", label: "In-clinic visits", enabled: true },
];

export function ConsultationSettingsCard() {
  return (
    <PanelCard title="Consultation settings" className="h-fit">
      <form className="grid gap-4 p-5">
        <FormField id="slot-duration" label="Slot duration">
          <NativeSelect
            id="slot-duration"
            defaultValue={slotDurations[1]}
            className="w-full"
          >
            {slotDurations.map((duration) => (
              <NativeSelectOption key={duration} value={duration}>
                {duration}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="consultation-fee" label="Consultation fee (PKR)">
          <Input id="consultation-fee" type="number" defaultValue={3000} />
        </FormField>
        <ul className="grid gap-3 border-t pt-4">
          {consultationModes.map((mode) => (
            <li key={mode.id} className="flex items-center justify-between">
              <label htmlFor={mode.id} className="text-sm">
                {mode.label}
              </label>
              <Switch id={mode.id} defaultChecked={mode.enabled} />
            </li>
          ))}
        </ul>
        <Button type="button" className="mt-2">
          Save availability
        </Button>
      </form>
    </PanelCard>
  );
}
