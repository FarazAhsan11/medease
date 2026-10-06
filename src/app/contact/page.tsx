import type { Metadata } from "next";

import { ContactDetails } from "@/features/contact/components/contact-details";
import { ContactForm } from "@/features/contact/components/contact-form";

export const metadata: Metadata = {
  title: "Contact Us",
};

export default function ContactPage() {
  return (
    <div className="flex flex-col items-center justify-center bg-surface px-[120px] py-5 max-sm:px-5">
      <div className="flex flex-wrap gap-5 max-xl:gap-[15px] max-md:flex-col max-md:gap-5">
        <ContactForm />
        <ContactDetails />
      </div>
    </div>
  );
}
