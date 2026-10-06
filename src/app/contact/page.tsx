import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/shared/page-header";
import { ContactDetails } from "@/features/contact/components/contact-details";
import { ContactForm } from "@/features/contact/components/contact-form";

export const metadata: Metadata = {
  title: "Contact Us",
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Let's chat, reach out to us"
        description="Have questions or feedback? We're here to help. Send us a message and our team will get back to you."
      />
      <Container className="grid gap-6 py-10 lg:grid-cols-[1.4fr_1fr]">
        <ContactForm />
        <ContactDetails />
      </Container>
    </>
  );
}
