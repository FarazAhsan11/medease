type AboutSectionTitleProps = {
  children: string;
  className?: string;
};

export function AboutSectionTitle({
  children,
  className,
}: AboutSectionTitleProps) {
  return (
    <h2 className={className ?? "mt-6 mb-5 text-[28.8px] font-bold"}>
      {children}
    </h2>
  );
}
