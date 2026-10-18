import { CalendarCheck2Icon, Loader2Icon } from "lucide-react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { PanelCard } from "@/components/shared/panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { SLOT_LENGTHS } from "@/features/doctor-dashboard/lib/schedule";

type ScheduleSettingsCardProps = {
  slotMinutes: number;
  onSlotMinutesChange: (value: number) => void;
  fee: string;
  onFeeChange: (value: string) => void;
  accepting: boolean;
  onAcceptingChange: (value: boolean) => void;
  weeklySlots: number;
  hasProblems: boolean;
  pending: boolean;
  feeError?: string;
};

export function ScheduleSettingsCard({
  slotMinutes,
  onSlotMinutesChange,
  fee,
  onFeeChange,
  accepting,
  onAcceptingChange,
  weeklySlots,
  hasProblems,
  pending,
  feeError,
}: ScheduleSettingsCardProps) {
  return (
    <PanelCard title="Booking settings" className="h-fit">
      <div className="grid gap-4 p-5">
        <div className="flex items-start justify-between gap-4 rounded-xl bg-muted p-3">
          <div>
            <label htmlFor="accepting" className="text-sm font-medium">
              Accept new bookings
            </label>
            <p className="text-xs text-muted-foreground">
              Turn off to pause bookings without losing your hours.
            </p>
          </div>
          <Switch
            id="accepting"
            checked={accepting}
            onCheckedChange={onAcceptingChange}
          />
        </div>

        <FormField id="slot-minutes" label="Appointment length">
          <NativeSelect
            id="slot-minutes"
            name="slotMinutes"
            value={String(slotMinutes)}
            onChange={(event) =>
              onSlotMinutesChange(Number(event.target.value))
            }
            className="w-full"
          >
            {SLOT_LENGTHS.map((minutes) => (
              <NativeSelectOption key={minutes} value={minutes}>
                {minutes} minutes
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>

        <FormField
          id="consultation-fee"
          label="Consultation fee (PKR)"
          error={feeError}
        >
          <Input
            id="consultation-fee"
            name="fee"
            type="number"
            min={0}
            step={100}
            inputMode="numeric"
            value={fee}
            onChange={(event) => onFeeChange(event.target.value)}
            {...fieldErrorProps("consultation-fee", feeError)}
          />
        </FormField>

        <p className="flex items-center gap-2 border-t pt-4 text-sm text-muted-foreground">
          <CalendarCheck2Icon
            className="size-4 shrink-0 text-primary"
            aria-hidden
          />
          {accepting
            ? `${weeklySlots} bookable ${weeklySlots === 1 ? "slot" : "slots"} a week`
            : "Bookings paused"}
        </p>

        <Button
          type="submit"
          disabled={pending || hasProblems}
          className="gap-2"
        >
          {pending && <Loader2Icon className="animate-spin" aria-hidden />}
          {pending ? "Saving…" : "Save schedule"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Changing hours never cancels existing appointments. Cancel those from
          your appointments if needed.
        </p>
      </div>
    </PanelCard>
  );
}
