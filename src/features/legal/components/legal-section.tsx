import type { LegalBlock, LegalSection as Section } from "../data/legal-types";
import { LegalTable } from "./legal-table";

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") return <p>{block}</p>;

  if (Array.isArray(block)) {
    return (
      <ul className="list-disc space-y-1.5 pl-5">
        {block.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  return <LegalTable table={block} />;
}

type LegalSectionProps = {
  number: number;
  section: Section;
};

export function LegalSection({ number, section }: LegalSectionProps) {
  return (
    <section>
      <h2 className="text-base font-semibold">
        {number}. {section.title}
      </h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {section.body.map((block, index) => (
          <Block key={index} block={block} />
        ))}
      </div>
    </section>
  );
}
