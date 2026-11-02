import { PanelCard } from "@/components/shared/panel-card";
import { StatusBadge } from "@/components/shared/status-badge";

import { TELEMEDICINE_CONSENT } from "../lib/consent-documents";
import { ConsentDocumentLink } from "./consent-document-link";
import { GiveConsentForm } from "./give-consent-form";
import { WithdrawConsentDialog } from "./withdraw-consent-dialog";

export function TelemedicineConsentCard({ given }: { given: boolean }) {
  return (
    <PanelCard
      title="Telemedicine consent"
      description="Needed to book consultations."
      action={
        <StatusBadge tone={given ? "success" : "muted"}>
          {given ? "Given" : "Withdrawn"}
        </StatusBadge>
      }
    >
      {given ? (
        <div className="grid gap-3 p-5">
          <p className="text-sm text-muted-foreground">
            Read the <ConsentDocumentLink document={TELEMEDICINE_CONSENT} />.
            Cancel any booked visits before you withdraw.
          </p>
          <WithdrawConsentDialog />
        </div>
      ) : (
        <div className="p-5">
          <GiveConsentForm />
        </div>
      )}
    </PanelCard>
  );
}
