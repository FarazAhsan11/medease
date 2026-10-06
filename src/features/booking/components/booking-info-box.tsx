type BookingInfoBoxProps = {
  title: string;
  lines: string[];
};

export function BookingInfoBox({ title, lines }: BookingInfoBoxProps) {
  return (
    <div className="w-[30%] rounded-lg bg-brand-soft p-2.5 max-[759px]:mb-2.5 max-[759px]:w-[70%]">
      <h3 className="my-[5px] text-[13.28px] font-bold">{title}</h3>
      {lines.map((line) => (
        <p key={line} className="text-ink-booking">
          {line}
        </p>
      ))}
    </div>
  );
}
