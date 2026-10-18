"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { FLASH_COOKIE, type Flash } from "@/lib/flash";

type FlashToasterProps = {
  flash: Flash | null;
};

export function FlashToaster({ flash }: FlashToasterProps) {
  useEffect(() => {
    if (!flash) return;

    // The id keeps a double-run effect from showing the toast twice.
    toast[flash.type](flash.message, { id: flash.id });
    document.cookie = `${FLASH_COOKIE}=; Max-Age=0; path=/`;
  }, [flash]);

  return null;
}
