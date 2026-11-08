import { HouseIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CatalogListedSwitch } from "@/features/lab-catalog/components/catalog-listed-switch";
import { LabTestSheet } from "@/features/lab-catalog/components/lab-test-sheet";
import type { LabCatalogTest } from "@/features/lab-catalog/data/lab-catalog";
import {
  categoryLabel,
  formatTurnaround,
  sampleTypeLabel,
} from "@/features/lab-catalog/lib/lab-catalog";
import { formatFee } from "@/lib/format";

type LabTestsTableProps = {
  tests: LabCatalogTest[];
};

export function LabTestsTable({ tests }: LabTestsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-5">Test</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead className="hidden lg:table-cell">Results in</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Listed</TableHead>
            <TableHead className="pr-5 text-right">
              <span className="sr-only">Edit</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tests.map((test) => (
            <TableRow key={test.id}>
              <TableCell className="max-w-56 pl-5 whitespace-normal">
                <p className="font-medium">{test.name}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span>{sampleTypeLabel(test.sampleType)} sample</span>
                  {test.homeCollection && (
                    <span className="inline-flex items-center gap-1">
                      <HouseIcon className="size-3" aria-hidden />
                      Home collection
                    </span>
                  )}
                  <span className="lg:hidden">
                    {formatTurnaround(test.turnaroundHours)}
                  </span>
                </p>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant="secondary">
                  {categoryLabel(test.category)}
                </Badge>
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {formatTurnaround(test.turnaroundHours)}
              </TableCell>
              <TableCell className="font-medium">
                {formatFee(test.price)}
              </TableCell>
              <TableCell>
                <CatalogListedSwitch
                  kind="test"
                  id={test.id}
                  listed={test.listed}
                  label={`List ${test.name} for patients`}
                />
              </TableCell>
              <TableCell className="pr-5 text-right">
                <LabTestSheet test={test} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
