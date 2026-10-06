import Image from "next/image";

export function AboutHero() {
  return (
    <section className="mb-[30px] flex items-center justify-between gap-[200px] rounded-t-xl bg-linear-to-r from-brand to-brand-glow px-[140px] py-10 text-center text-[19.2px] font-black tracking-[1px] text-white max-[480px]:p-[15px] max-lg:flex-col max-lg:gap-5 max-lg:p-5">
      <div className="max-w-1/2 max-lg:max-w-full">
        <h1 className="my-[0.67em] mb-5 text-[2.8em] font-bold max-[480px]:text-[1.5em] max-md:text-[2em]">
          Welcome to MedEase
        </h1>
        <p className="mt-[5px] mb-5 text-[1.2em] text-ink-muted max-[480px]:text-[0.9em] max-md:text-[1em]">
          Your one-stop platform for seamless healthcare solutions. From booking
          appointments to managing lab tests and medical records, we&apos;ve got
          you covered.
        </p>
        <button
          type="button"
          className="rounded-[5px] bg-surface-soft px-5 py-2.5 font-normal tracking-normal text-brand transition-all duration-300 hover:bg-brand hover:text-white"
        >
          Discover More
        </button>
      </div>
      <Image
        src="/images/about-hero.svg"
        alt="Healthcare illustration"
        width={400}
        height={300}
        className="h-[300px] w-[400px] rounded-lg max-lg:h-[250px] max-lg:w-full"
      />
    </section>
  );
}
