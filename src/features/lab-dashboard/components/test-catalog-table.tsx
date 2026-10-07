import { PencilIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LabTest } from "@/features/lab-tests/data/lab-tests";
import { formatFee } from "@/lib/format";

type TestCatalogTableProps = {
  tests: LabTest[];
  inactiveIds?: string[];
};

export function TestCatalogTable({
  tests,
  inactiveIds = [],
}: TestCatalogTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-5">Test</TableHead>
            <TableHead className="hidden sm:table-cell">Category</TableHead>
            <TableHead className="hidden lg:table-cell">Turnaround</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Listed</TableHead>
            <TableHead className="pr-5 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tests.map((test) => (
            <TableRow key={test.id}>
              <TableCell className="pl-5">
                <p className="font-medium">{test.name}</p>
                <p className="text-xs text-muted-foreground">
                  {test.sampleType} sample
                </p>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant="secondary">{test.category}</Badge>
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {test.turnaround}
              </TableCell>
              <TableCell className="font-medium">
                {formatFee(test.price)}
              </TableCell>
              <TableCell>
                <Switch
                  defaultChecked={!inactiveIds.includes(test.id)}
                  aria-label={`List ${test.name} for booking`}
                />
              </TableCell>
              <TableCell className="pr-5 text-right">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Edit ${test.name}`}
                >
                  <PencilIcon />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
