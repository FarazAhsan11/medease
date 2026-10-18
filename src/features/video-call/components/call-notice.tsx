import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type CallNoticeProps = {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
};

// Centered message on the dark call background, for every non-video state.
export function CallNotice({
  icon: Icon,
  title,
  description,
  children,
}: CallNoticeProps) {
  return (
    <div className="flex h-[calc(100dvh-11rem)] min-h-[420px] items-center justify-center rounded-3xl bg-linear-to-br from-ink via-ink to-primary/60 p-6 text-center text-white">
      <div className="max-w-md">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/10">
          <Icon className="size-6" aria-hidden />
        </span>
        <h2 className="mt-5 text-lg font-semibold">{title}</h2>
        {description && (
          <p className="mt-2 text-sm text-white/70">{description}</p>
        )}
        {children && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
