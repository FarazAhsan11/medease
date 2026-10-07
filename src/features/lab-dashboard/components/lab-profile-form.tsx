import { FlaskConicalIcon } from "lucide-react";

import { FormField } from "@/components/shared/form-field";
import { IconTile } from "@/components/shared/icon-tile";
import { PanelCard } from "@/components/shared/panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { LabProfile } from "@/features/lab-dashboard/data/lab-dashboard";

type LabProfileFormProps = {
  profile: LabProfile;
};

const fields = [
  { id: "name", label: "Laboratory name", type: "text" },
  { id: "registrationNumber", label: "Registration number", type: "text" },
  { id: "contactPerson", label: "Contact person", type: "text" },
  { id: "hours", label: "Opening hours", type: "text" },
  { id: "email", label: "Email", type: "email" },
  { id: "phone", label: "Phone", type: "tel" },
] as const;

export function LabProfileForm({ profile }: LabProfileFormProps) {
  return (
    <PanelCard
      title="Laboratory details"
      description="Shown to patients when they book a test."
    >
      <form className="grid gap-5 p-5">
        <div className="flex items-center gap-4">
          <IconTile icon={FlaskConicalIcon} size="lg" tone="solid" />
          <Button type="button" variant="outline" size="sm">
            Upload logo
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <FormField
              key={field.id}
              id={`lab-${field.id}`}
              label={field.label}
            >
              <Input
                id={`lab-${field.id}`}
                type={field.type}
                defaultValue={profile[field.id]}
              />
            </FormField>
          ))}
          <FormField id="lab-address" label="Address" className="sm:col-span-2">
            <Textarea
              id="lab-address"
              rows={2}
              defaultValue={profile.address}
            />
          </FormField>
        </div>
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="button">Save changes</Button>
        </div>
      </form>
    </PanelCard>
  );
}
