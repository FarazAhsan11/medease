import { FlaskConicalIcon } from "lucide-react";

import { PanelCard } from "@/components/shared/panel-card";
import { Button } from "@/components/ui/button";
import { completeTestCheckout } from "@/features/payments/actions/complete-test-checkout";
import { formatTime, CLINIC_TIMEZONE } from "@/lib/datetime";
import { formatFee } from "@/lib/format";

type TestCheckoutCardProps = {
  session: string;
  amount: number;
  expiresAt: number;
  expired: boolean;
};

// Stands in for a provider's hosted checkout page while no provider is
// signed. Each button is a real outcome: the webhook decides the rest.
export function TestCheckoutCard({
  session,
  amount,
  expiresAt,
  expired,
}: TestCheckoutCardProps) {
  return (
    <PanelCard
      title="Test checkout"
      description="Development only. No money moves."
    >
      <form action={completeTestCheckout} className="space-y-5 p-5">
        <input type="hidden" name="session" value={session} />
        <div className="flex items-center gap-3 rounded-xl bg-muted p-4">
          <FlaskConicalIcon className="size-5 text-muted-foreground" />
          <div>
            <p className="text-2xl font-semibold">{formatFee(amount)}</p>
            <p className="text-xs text-muted-foreground">
              {expired
                ? "This checkout has expired."
                : `Pay by ${formatTime(new Date(expiresAt), CLINIC_TIMEZONE)}`}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="submit"
            name="outcome"
            value="paid"
            disabled={expired}
            className="flex-1"
          >
            Pay {formatFee(amount)}
          </Button>
          <Button
            type="submit"
            name="outcome"
            value="declined"
            variant="outline"
            disabled={expired}
            className="flex-1"
          >
            Decline payment
          </Button>
        </div>
        <Button
          type="submit"
          name="outcome"
          value="back"
          variant="ghost"
          className="w-full"
        >
          Back without paying
        </Button>
      </form>
    </PanelCard>
  );
}
