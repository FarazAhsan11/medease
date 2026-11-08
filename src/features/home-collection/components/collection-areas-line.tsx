import { HouseIcon } from "lucide-react";

import {
  formatCollectionCities,
  formatCollectionFee,
  type LabCollectionAreas,
} from "@/features/home-collection/lib/home-collection";

type CollectionAreasLineProps = {
  areas: LabCollectionAreas;
};

// "Home collection in Lahore, Sheikhupura (Rs 300 fee)", as a list item for
// the details under a lab's offer or package.
export function CollectionAreasLine({ areas }: CollectionAreasLineProps) {
  return (
    <li className="flex items-start gap-1.5 text-muted-foreground">
      <HouseIcon className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>
        Home collection in {formatCollectionCities(areas.cities)} (
        {formatCollectionFee(areas)})
      </span>
    </li>
  );
}
