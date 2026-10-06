import { SiteFooter } from "@/components/layout/site-footer";
import { DoctorSearchBar } from "@/components/shared/doctor-search-bar";
import { FaqSection } from "@/features/home/components/faq-section";
import { Hero } from "@/features/home/components/hero";
import { ServicesSection } from "@/features/home/components/services-section";
import { WhyChooseUs } from "@/features/home/components/why-choose-us";

const searchOptions = ["Doctors", "Dentists", "Specialists"];

export default function HomePage() {
  return (
    <>
      <div className="flex flex-col bg-surface px-[70px] py-5 max-nav:p-5">
        <Hero />
        <div className="flex items-center justify-center max-nav:hidden">
          <DoctorSearchBar
            options={searchOptions}
            className="w-[600px] py-2.5 pl-[17px] shadow-search"
          />
        </div>
        <ServicesSection />
        <WhyChooseUs />
        <FaqSection />
      </div>
      <SiteFooter />
    </>
  );
}
