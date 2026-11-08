import { Loader2Icon, TruckIcon } from "lucide-react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { PanelCard } from "@/components/shared/panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  COLLECTION_SLOT_LENGTHS,
  formatDuration,
  NOTICE_HOURS,
  SLOT_CAPACITY,
} from "@/features/home-collection/lib/home-collection";

type CollectionSettingsCardProps = {
  accepting: boolean;
  onAcceptingChange: (value: boolean) => void;
  // Collection can be switched on only with a city and some hours.
  hasAreas: boolean;
  slotMinutes: number;
  onSlotMinutesChange: (value: number) => void;
  capacity: string;
  onCapacityChange: (value: string) => void;
  noticeHours: number;
  onNoticeHoursChange: (value: number) => void;
  freeAbove: string;
  onFreeAboveChange: (value: string) => void;
  weeklySlots: number;
  hasProblems: boolean;
  pending: boolean;
  fieldError: (name: string) => string | undefined;
};

export function CollectionSettingsCard(props: CollectionSettingsCardProps) {
  // The database also refuses collection without hours or a city.
  const missing = !props.hasAreas
    ? "Add a city below to turn this on."
    : props.weeklySlots === 0
      ? "Add collection hours to turn this on."
      : null;
  const canTurnOn = props.accepting || !missing;
  const capacity = Number(props.capacity);
  const weeklyVisits =
    Number.isInteger(capacity) && capacity > 0
      ? props.weeklySlots * capacity
      : 0;
  const capacityError = props.fieldError("capacity");
  const freeAboveError = props.fieldError("freeAbove");

  return (
    <PanelCard title="Collection settings" className="h-fit">
      <div className="grid gap-4 p-5">
        <div className="flex items-start justify-between gap-4 rounded-xl bg-muted p-3">
          <div>
            <label
              htmlFor="collection-accepting"
              className="text-sm font-medium"
            >
              Offer home collection
            </label>
            <p className="text-xs text-muted-foreground">
              {missing ??
                "Turn off to pause new bookings without losing your setup."}
            </p>
          </div>
          <Switch
            id="collection-accepting"
            checked={props.accepting}
            disabled={!canTurnOn}
            onCheckedChange={props.onAcceptingChange}
          />
        </div>

        <FormField
          id="collection-slot-minutes"
          label="Arrival window"
          hint="Patients pick a window; the collector arrives within it."
        >
          <NativeSelect
            id="collection-slot-minutes"
            name="slotMinutes"
            value={String(props.slotMinutes)}
            onChange={(event) =>
              props.onSlotMinutesChange(Number(event.target.value))
            }
            className="w-full"
          >
            {COLLECTION_SLOT_LENGTHS.map((minutes) => (
              <NativeSelectOption key={minutes} value={minutes}>
                {formatDuration(minutes)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>

        <FormField
          id="collection-capacity"
          label="Visits per window"
          hint="About how many collectors you send out at once."
          error={capacityError}
        >
          <Input
            id="collection-capacity"
            name="capacity"
            type="number"
            min={SLOT_CAPACITY.min}
            max={SLOT_CAPACITY.max}
            inputMode="numeric"
            value={props.capacity}
            onChange={(event) => props.onCapacityChange(event.target.value)}
            {...fieldErrorProps("collection-capacity", capacityError)}
          />
        </FormField>

        <FormField id="collection-notice" label="Book at least">
          <NativeSelect
            id="collection-notice"
            name="noticeHours"
            value={String(props.noticeHours)}
            onChange={(event) =>
              props.onNoticeHoursChange(Number(event.target.value))
            }
            className="w-full"
          >
            {NOTICE_HOURS.map((hours) => (
              <NativeSelectOption key={hours} value={hours}>
                {formatDuration(hours * 60)} ahead
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>

        <FormField
          id="collection-free-above"
          label="Free collection above (optional, PKR)"
          hint="Waive the fee when an order reaches this amount."
          error={freeAboveError}
        >
          <Input
            id="collection-free-above"
            name="freeAbove"
            type="number"
            min={1}
            step={100}
            inputMode="numeric"
            value={props.freeAbove}
            onChange={(event) => props.onFreeAboveChange(event.target.value)}
            {...fieldErrorProps("collection-free-above", freeAboveError)}
          />
        </FormField>

        <p className="flex items-center gap-2 border-t pt-4 text-sm text-muted-foreground">
          <TruckIcon className="size-4 shrink-0 text-primary" aria-hidden />
          {props.accepting
            ? `Up to ${weeklyVisits} ${weeklyVisits === 1 ? "visit" : "visits"} a week`
            : "Home collection is off"}
        </p>

        <Button
          type="submit"
          disabled={props.pending || props.hasProblems}
          className="gap-2"
        >
          {props.pending && (
            <Loader2Icon className="animate-spin" aria-hidden />
          )}
          {props.pending ? "Saving…" : "Save"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Changing these never cancels a booking already made.
        </p>
      </div>
    </PanelCard>
  );
}
