import {
  describeDose,
  describeDuration,
  medicineFormLabels,
  medicineName,
  type PrescriptionItem,
} from "@/features/prescriptions/lib/prescriptions";

type PrescriptionItemDetailsProps = {
  item: PrescriptionItem;
  number: number;
};

export function PrescriptionItemDetails({
  item,
  number,
}: PrescriptionItemDetailsProps) {
  return (
    <li className="grid break-inside-avoid gap-1 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
        <p className="text-sm font-semibold">
          {number}. {medicineName(item)}{" "}
          <span className="font-normal text-muted-foreground">
            ({medicineFormLabels[item.form]})
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          {describeDuration(item)}
        </p>
      </div>
      <p className="text-sm">{describeDose(item)}</p>
      {item.instructions && (
        <p className="text-xs text-muted-foreground">{item.instructions}</p>
      )}
    </li>
  );
}
