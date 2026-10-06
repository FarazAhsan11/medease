type SectionHeadingProps = {
  eyebrow: string;
  title: string;
};

export function SectionHeading({ eyebrow, title }: SectionHeadingProps) {
  return (
    <>
      <span className="text-brand">{eyebrow}</span>
      <h2 className="my-[21px] text-[32px] font-bold">{title}</h2>
    </>
  );
}
