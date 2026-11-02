import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { LegalTable as LegalTableData } from "../data/legal-types";

export function LegalTable({ table }: { table: LegalTableData }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {table.headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((row) => (
            <TableRow key={row.join()}>
              {row.map((cell, index) => (
                <TableCell
                  key={table.headers[index]}
                  className="align-top whitespace-normal"
                >
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
