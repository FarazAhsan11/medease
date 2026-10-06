import Image from "next/image";

export function ChatInput() {
  return (
    <div className="flex justify-center">
      <form className="flex h-[50px] w-full max-w-[400px] items-center justify-between overflow-x-hidden rounded-[18px] bg-surface pl-2.5 max-md:mb-5 max-md:max-w-[95%]">
        <textarea
          rows={2}
          aria-label="Describe your symptoms"
          placeholder="Describe your symptoms..."
          className="w-full max-w-[300px] resize-none bg-transparent font-mono text-[13px] outline-none"
        />
        <button
          type="button"
          aria-label="Send"
          className="mr-2.5 flex size-[34px] shrink-0 items-center justify-center rounded-full bg-brand-bubble max-md:size-[30px]"
        >
          <Image
            src="/images/arrow-up-left.svg"
            alt=""
            width={13}
            height={12}
          />
        </button>
      </form>
    </div>
  );
}
