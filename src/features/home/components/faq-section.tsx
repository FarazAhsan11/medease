import { FaqItem } from "@/features/home/components/faq-item";
import { SectionHeading } from "@/features/home/components/section-heading";
import { faqs } from "@/features/home/data/faqs";

export function FaqSection() {
  return (
    <section className="mb-[140px] py-5 max-nav:p-2.5">
      <SectionHeading eyebrow="FAQ's" title="Got Questions?" />
      <div className="flex flex-col items-center">
        {faqs.map((faq) => (
          <FaqItem key={faq.question} faq={faq} />
        ))}
      </div>
    </section>
  );
}
