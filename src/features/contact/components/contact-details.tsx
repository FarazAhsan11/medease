import Image from "next/image";

import { ContactInfoItem } from "@/features/contact/components/contact-info-item";
import { contactInfo } from "@/features/contact/data/contact-info";

export function ContactDetails() {
  return (
    <section className="max-w-[55%] flex-[1_1_45%] rounded-2xl bg-white p-5 shadow-panel max-xl:max-w-[48%] max-xl:flex-[1_1_48%] max-lg:max-w-full max-lg:flex-[1_1_100%]">
      <h2 className="mt-6 mb-5 text-[28.8px] font-bold">Contact Information</h2>
      <div className="flex max-[480px]:flex-col">
        <div className="flex flex-col gap-2.5">
          {contactInfo.map((item) => (
            <ContactInfoItem key={item.label} item={item} />
          ))}
        </div>
        <Image
          src="/images/contact-illustration.svg"
          alt=""
          width={300}
          height={300}
          className="h-[300px] w-full min-w-0"
        />
      </div>
    </section>
  );
}
