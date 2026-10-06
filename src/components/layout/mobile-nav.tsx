"use client";

import Image from "next/image";
import { useState } from "react";

import { AccountLink } from "@/components/layout/account-link";
import { Logo } from "@/components/layout/logo";
import { NavLinkItem } from "@/components/layout/nav-link-item";
import { mainNav } from "@/config/navigation";
import { cn } from "@/lib/utils";

const mobileLinkClass = "w-full py-3 text-left text-sm";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex w-full justify-evenly nav:hidden">
      <div className="flex w-full items-center justify-between">
        <Logo />
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="text-2xl font-bold text-ink"
        >
          &#9776;
        </button>
      </div>

      <div
        className={cn(
          "fixed top-0 z-[1000] flex h-screen w-[70%] flex-col items-start bg-white pt-5 pl-8 text-ink transition-[right] duration-300 ease-in-out",
          open ? "right-0" : "-right-full",
        )}
      >
        <div className="flex w-full items-center p-2.5">
          <span className="mr-[70px] text-2xl font-black text-ink">
            MEDEASE
          </span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <Image src="/images/cross.png" alt="" width={24} height={24} />
          </button>
        </div>
        <ul className="flex w-full flex-col" onClick={() => setOpen(false)}>
          <li className={mobileLinkClass}>
            <AccountLink />
          </li>
          {mainNav
            .filter((item) => !item.desktopOnly)
            .map((item) => (
              <NavLinkItem
                key={item.href}
                href={item.href}
                title={item.title}
                className={mobileLinkClass}
              />
            ))}
        </ul>
      </div>
    </div>
  );
}
