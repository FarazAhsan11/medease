"use client";

import { HeartPulseIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MedicalProfileDetails } from "@/features/medical-profile/components/medical-profile-details";
import type { MedicalProfile } from "@/features/medical-profile/lib/medical-profile";

// Opens the medical profile over the call screen without leaving the call.
export function MedicalProfileSheet({ profile }: { profile: MedicalProfile }) {
  return (
    <Sheet>
      <SheetTrigger
        render={<Button size="sm" variant="outline" className="gap-1.5" />}
      >
        <HeartPulseIcon aria-hidden />
        Medical profile
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Medical profile</SheetTitle>
          <SheetDescription>{profile.name}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <MedicalProfileDetails profile={profile} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
