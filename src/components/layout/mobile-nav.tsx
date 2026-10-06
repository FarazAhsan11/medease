"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Logo } from "@/components/layout/logo";
import { NavLinks } from "@/components/layout/nav-links";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function MobileNav() {
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
        <div className="mt-auto grid gap-2 border-t p-4">
          <Link
            href="/login"
            onClick={close}
            className={cn(buttonVariants({ variant: "outline" }), "h-9")}
          >
            Log in
          </Link>
          <Link
            href="/register"
            onClick={close}
            className={cn(buttonVariants(), "h-9")}
          >
            Create account
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
