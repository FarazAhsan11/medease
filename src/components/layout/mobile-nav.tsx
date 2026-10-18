"use client";

import { MenuIcon } from "lucide-react";
import { useState } from "react";

import { HeaderAuthActions } from "@/components/layout/header-auth-actions";
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
import { dashboards, type DashboardRole } from "@/config/dashboards";

type MobileNavProps = {
  role: DashboardRole | null;
};

export function MobileNav({ role }: MobileNavProps) {
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
            <Logo href={role ? dashboards[role].home : "/"} />
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="Mobile" className="px-2">
          <NavLinks role={role} orientation="vertical" onNavigate={close} />
        </nav>
        {!role && (
          <div className="mt-auto border-t p-4">
            <HeaderAuthActions layout="stacked" onNavigate={close} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
