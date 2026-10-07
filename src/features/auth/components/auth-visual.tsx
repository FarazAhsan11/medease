import { QuoteIcon } from "lucide-react";
import Image from "next/image";

import { AuthPattern } from "@/features/auth/components/auth-pattern";

type AuthVisualProps = {
  image?: string;
  quote: string;
  author: string;
};

export function AuthVisual({ image, quote, author }: AuthVisualProps) {
  return (
    <div className="relative hidden overflow-hidden rounded-3xl bg-linear-to-br from-primary to-brand lg:block">
      {image ? (
        <Image
          src={image}
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover object-top opacity-90 mix-blend-luminosity"
        />
      ) : (
        <AuthPattern />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-ink/80 via-ink/10 to-transparent" />
      <figure className="absolute inset-x-0 bottom-0 p-8 text-white">
        <QuoteIcon className="size-6 text-white/70" aria-hidden />
        <blockquote className="mt-3 max-w-md text-lg leading-relaxed font-medium">
          {quote}
        </blockquote>
        <figcaption className="mt-3 text-sm text-white/70">{author}</figcaption>
      </figure>
    </div>
  );
}
