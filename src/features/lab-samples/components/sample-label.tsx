import type { LabBooking } from "@/features/lab-booking/lib/lab-bookings";
import { code128Svg } from "@/features/lab-samples/lib/barcode.server";
import {
  sampleTypeLabels,
  type LabSampleDetail,
} from "@/features/lab-samples/lib/samples";
import { formatDateKey, formatDateTime } from "@/lib/datetime";

type SampleLabelProps = {
  booking: Pick<
    LabBooking,
    | "careRecipientName"
    | "careRecipientDateOfBirth"
    | "careRecipientGender"
    | "visitDate"
    | "timezone"
  >;
  sample: LabSampleDetail;
};

// One 2 x 1 inch tube label (CLSI AUTO12): the name top left, a second
// identifier, the sample type, the barcode and its code. The barcode carries
// only the code. Collection time and collector are written at the bedside
// when the label was printed ahead. White on screen too, like the label.
export function SampleLabel({ booking, sample }: SampleLabelProps) {
  const gender = booking.careRecipientGender
    ? booking.careRecipientGender.charAt(0).toUpperCase()
    : null;
  const identifier = [
    booking.careRecipientDateOfBirth
      ? `DOB ${formatDateKey(booking.careRecipientDateOfBirth)}`
      : null,
    gender,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex h-[25.4mm] w-[50.8mm] flex-col overflow-hidden bg-label px-[1.5mm] py-[1.5mm] leading-tight text-label-foreground">
      <div className="flex items-baseline justify-between gap-[1mm]">
        <p className="truncate text-[8pt] font-bold">
          {booking.careRecipientName}
        </p>
        <p className="shrink-0 text-[7pt] font-bold">
          {sampleTypeLabels[sample.sample_type]}
        </p>
      </div>
      <p className="truncate text-[6pt]">
        {[identifier, `Visit ${formatDateKey(booking.visitDate)}`]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <div
        className="mt-[0.8mm] h-[8.5mm] [&>svg]:h-full [&>svg]:w-full"
        // Our own SVG, made from a checked sample code.
        dangerouslySetInnerHTML={{ __html: code128Svg(sample.code) }}
        role="img"
        aria-label={`Barcode ${sample.code}`}
      />
      <p className="text-center font-mono text-[7pt] font-bold tracking-wide">
        {sample.code}
      </p>
      <p className="mt-auto truncate text-[5.5pt]">
        {sample.collected_at
          ? `Collected ${formatDateTime(sample.collected_at, booking.timezone)}`
          : "Collected ________  By ________"}
      </p>
    </div>
  );
}
