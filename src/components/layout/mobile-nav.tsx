"use client";

import { MenuIcon } from "lucide-react";
import { useState } from "react";

import {
  HeaderAccountActions,
  type HeaderAccount,
} from "@/components/layout/header-account";
import { Logo } from "@/components/layout/logo";
import { NavLinks } from "@/components/layout/nav-links";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type MobileNavProps = {
  account: HeaderAccount | null;
};

export function MobileNav({ account }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" aria-label="Open menu" />}
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader className="border-b">
          <SheetTitle render={<div />}>
            <Logo />
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="Mobile" className="px-2">
          <NavLinks orientation="vertical" onNavigate={close} />
        </nav>
        <div className="mt-auto border-t p-4">
          <HeaderAccountActions
            account={account}
            layout="stacked"
            onNavigate={close}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
