"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

// Hides the bar if a navigation never lands, e.g. a link back to this page.
const MAX_VISIBLE_MS = 10_000;

function isSameTabLink(event: MouseEvent, link: HTMLAnchorElement) {
  const modified =
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey;

  return (
    !modified && !link.hasAttribute("download") && link.target !== "_blank"
  );
}

function isNewPage(href: string) {
  const next = new URL(href, window.location.href);
  const { origin, pathname, search } = window.location;

  return (
    next.origin === origin &&
    (next.pathname !== pathname || next.search !== search)
  );
}

function ProgressBar() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const route = `${pathname}?${search}`;
  // The route the click left from: once the route changes, the bar is gone.
  const [leaving, setLeaving] = useState<string | null>(null);
  const active = leaving === route;

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const link = (event.target as Element).closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (isSameTabLink(event, link) && isNewPage(link.href)) setLeaving(route);
    }

    // Search and filter forms navigate too; forms with no action are mutations,
    // which show their own pending state.
    function onSubmit(event: SubmitEvent) {
      const form = event.target as HTMLFormElement;
      if (form.method === "get" && form.hasAttribute("action")) {
        setLeaving(route);
      }
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [route]);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setLeaving(null), MAX_VISIBLE_MS);

    return () => clearTimeout(timer);
  }, [active]);

  if (!active) return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      className="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden print:hidden"
    >
      <div className="h-full w-1/3 animate-nav-progress rounded-full bg-primary motion-reduce:w-full motion-reduce:animate-none" />
    </div>
  );
}

// A click anywhere in the app shows this straight away, before the server has
// answered. Suspense because reading search params can suspend.
export function NavigationProgress() {
  return (
    <Suspense>
      <ProgressBar />
    </Suspense>
  );
}
