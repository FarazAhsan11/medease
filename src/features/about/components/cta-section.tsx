import { AboutSectionTitle } from "@/features/about/components/about-section-title";

export function CtaSection() {
  return (
    <section className="my-[30px] bg-linear-to-r from-brand to-brand-glow px-5 py-[30px] text-center text-white max-[480px]:p-5">
      <AboutSectionTitle className="mt-6 mb-5 text-[28.8px] font-bold text-white">
        Ready to Simplify Your Healthcare Journey?
      </AboutSectionTitle>
      <p className="my-[5px] text-ink-muted">
        Join thousands of happy users who trust HealthCareConnect for their
        healthcare needs.
      </p>
      <button
        type="button"
        className="rounded-[5px] bg-white px-5 py-2.5 text-brand transition-all duration-300 hover:bg-linear-to-r hover:from-brand hover:to-brand-glow hover:text-white"
      >
        Get Started Today
      </button>
    </section>
  );
}
