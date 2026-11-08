"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Refreshes the page's server data when the tab comes back into view, so
// slots someone else took in the meantime show as taken.
export function useRefreshOnVisible() {
  const router = useRouter();
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);
}
