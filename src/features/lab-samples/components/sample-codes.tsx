import {
  sampleTypeLabels,
  type LabSample,
} from "@/features/lab-samples/lib/samples";

// A booking's open sample codes, each with its sample type.
export function SampleCodes({ samples }: { samples: LabSample[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {samples.map((sample) => (
        <li key={sample.code}>
          {sampleTypeLabels[sample.sampleType]}{" "}
          <span className="font-mono font-medium text-foreground">
            {sample.code}
          </span>
        </li>
      ))}
    </ul>
  );
}
