import { PanelCard } from "@/components/shared/panel-card";
import { DeleteServiceAreaDialog } from "@/features/home-collection/components/delete-service-area-dialog";
import { ServiceAreaSheet } from "@/features/home-collection/components/service-area-sheet";
import type { ServiceArea } from "@/features/home-collection/lib/home-collection";
import { formatFee } from "@/lib/format";

type ServiceAreasCardProps = {
  areas: ServiceArea[];
};

// The cities a lab collects in, each with its fee.
export function ServiceAreasCard({ areas }: ServiceAreasCardProps) {
  const taken = areas.map((area) => area.city);

  return (
    <PanelCard
      title="Cities you collect in"
      description="Patients with an address in one of these cities can book a collector."
      action={<ServiceAreaSheet taken={taken} />}
    >
      {areas.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          Add the cities your collectors reach, with the fee for each.
        </p>
      ) : (
        <ul className="divide-y">
          {areas.map((area) => (
            <li
              key={area.id}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {area.city}
                  <span className="font-normal text-muted-foreground">
                    {" · "}
                    {area.fee === 0 ? "Free" : formatFee(area.fee)}
                  </span>
                </p>
                {area.note && (
                  <p className="text-xs break-words text-muted-foreground">
                    {area.note}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <ServiceAreaSheet area={area} taken={taken} />
                <DeleteServiceAreaDialog areaId={area.id} city={area.city} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </PanelCard>
  );
}
