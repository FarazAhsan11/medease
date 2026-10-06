import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/shared/section-heading";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "@/features/home/data/faqs";

export function FaqSection() {
  return (
    <section id="faq" className="py-16 sm:py-20">
      <Container className="grid gap-10 lg:grid-cols-[1fr_1.5fr]">
        <div>
          <SectionHeading
            eyebrow="FAQ"
            title="Got questions?"
            description="Quick answers to the things patients ask us most."
          />
          <Link
            href="/contact"
            className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Still curious? Contact us
            <ArrowRightIcon className="size-4" aria-hidden />
          </Link>
        </div>

        <Accordion className="rounded-2xl border bg-card px-5">
          {faqs.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger className="py-4 text-sm font-semibold hover:no-underline sm:text-base">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Container>
    </section>
  );
}
