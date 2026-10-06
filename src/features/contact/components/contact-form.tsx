const fieldClass =
  "my-2 w-[300px] max-w-full rounded-md border-2 border-line-subtle bg-surface-subtle p-[0.8rem] text-base outline-none";

export function ContactForm() {
  return (
    <section className="max-w-[45%] flex-[1_1_45%] rounded-2xl bg-white p-5 shadow-panel max-xl:max-w-[48%] max-xl:flex-[1_1_48%] max-lg:max-w-full max-lg:flex-[1_1_100%]">
      <h1 className="my-[21px] text-[32px] font-bold max-sm:text-2xl">
        Let&apos;s Chat, Reach Out to Us
      </h1>
      <p className="my-[5px] text-ink-muted">
        Have questions or feedback? We&apos;re here to help. Send us a message,
        and we&apos;ll respond within 24 hours.
      </p>
      <form>
        <div className="mb-4 flex flex-col">
          <input
            type="email"
            name="email"
            required
            aria-label="Email address"
            placeholder="Email address"
            className={fieldClass}
          />
        </div>
        <div className="mb-4 flex flex-col">
          <textarea
            name="message"
            required
            aria-label="Message"
            placeholder="Leave us a message"
            className={`${fieldClass} min-h-20 resize-y font-mono text-[13px]`}
          />
        </div>
        <button
          type="button"
          className="w-[300px] max-w-full rounded-lg bg-brand px-5 py-3 text-base text-white hover:bg-brand-deep"
        >
          Send Message
        </button>
      </form>
    </section>
  );
}
