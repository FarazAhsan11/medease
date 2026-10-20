"use client";

import { CheckIcon, UserXIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { setAppointmentOutcome } from "@/features/appointments/actions/set-appointment-outcome";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type AppointmentOutcomeButtonsProps = {
  appointmentId: string;
  allowNoShow?: boolean;
};

export function AppointmentOutcomeButtons({
  appointmentId,
  allowNoShow = true,
}: AppointmentOutcomeButtonsProps) {
  const { pending, onSubmit } = useFormAction(
    setAppointmentOutcome,
    initialFormState,
  );

  return (
    <div className="flex flex-wrap gap-2">
      <form onSubmit={onSubmit}>
        <input type="hidden" name="appointmentId" value={appointmentId} />
        <input type="hidden" name="outcome" value="completed" />
        <Button type="submit" size="sm" disabled={pending} className="gap-1.5">
          <CheckIcon aria-hidden />
          Mark completed
        </Button>
      </form>
      {allowNoShow && (
        <form onSubmit={onSubmit}>
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <input type="hidden" name="outcome" value="no_show" />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={pending}
            className="gap-1.5"
          >
            <UserXIcon aria-hidden />
            No-show
          </Button>
        </form>
      )}
    </div>
  );
}
