import { DashboardSection } from "@/features/doctor-dashboard/components/dashboard-section";
import { LabeledText } from "@/features/doctor-dashboard/components/labeled-text";
import type { PatientMessage } from "@/features/doctor-dashboard/data/dashboard";

type MessagesTabProps = {
  messages: PatientMessage[];
};

export function MessagesTab({ messages }: MessagesTabProps) {
  return (
    <DashboardSection title="Messages">
      {messages.map((message) => (
        <div
          key={message.id}
          className="rounded-lg bg-white p-[15px] shadow-card"
        >
          <h3 className="text-base font-bold text-link">{message.sender}</h3>
          <p className="my-[5px] text-sm text-ink-muted">{message.message}</p>
          <LabeledText label="Time" value={message.time} />
        </div>
      ))}
    </DashboardSection>
  );
}
