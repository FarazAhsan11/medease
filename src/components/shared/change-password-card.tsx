import { FormField } from "@/components/shared/form-field";
import { PanelCard } from "@/components/shared/panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChangePasswordCard() {
  return (
    <PanelCard title="Password" description="Use at least 8 characters.">
      <form className="grid gap-4 p-5">
        <FormField id="current-password" label="Current password">
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="new-password" label="New password">
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
            />
          </FormField>
          <FormField id="confirm-password" label="Confirm password">
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
            />
          </FormField>
        </div>
        <Button type="button" variant="outline" className="w-fit">
          Update password
        </Button>
      </form>
    </PanelCard>
  );
}
