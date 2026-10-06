type LabeledTextProps = {
  label: string;
  value: string | number;
  as?: "p" | "span";
};

export function LabeledText({ label, value, as: Tag = "p" }: LabeledTextProps) {
  return (
    <Tag className="my-[5px] block text-sm text-ink-muted">
      <strong>{label}:</strong> {value}
    </Tag>
  );
}
