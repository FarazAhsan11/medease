import { PanelCard } from "@/components/shared/panel-card";
import { Switch } from "@/components/ui/switch";

export type ToggleOption = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
};

type ToggleListCardProps = {
  title: string;
  description?: string;
  options: ToggleOption[];
};

export function ToggleListCard({
  title,
  description,
  options,
}: ToggleListCardProps) {
  return (
    <PanelCard title={title} description={description}>
      <ul className="divide-y">
        {options.map((option) => (
          <li
            key={option.id}
            className="flex items-center justify-between gap-4 px-5 py-4"
          >
            <label htmlFor={option.id} className="grid gap-0.5">
              <span className="text-sm font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">
                {option.description}
              </span>
            </label>
            <Switch id={option.id} defaultChecked={option.enabled} />
          </li>
        ))}
      </ul>
    </PanelCard>
  );
}
