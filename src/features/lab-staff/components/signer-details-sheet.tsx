"use client";

import { Loader2Icon, SignatureIcon } from "lucide-react";
import { useState } from "react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { saveLabSigner } from "@/features/lab-staff/actions/save-lab-signer";
import type { LabSigner } from "@/features/lab-staff/lib/lab-staff";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type SignerDetailsSheetProps = {
  userId: string;
  name: string;
  signer: LabSigner | null;
};

// The admin enters how a signer's name and qualification print on the reports
// they sign off. The lab vouches for them, so signers can't change their own.
export function SignerDetailsSheet({
  userId,
  name,
  signer,
}: SignerDetailsSheetProps) {
  const [open, setOpen] = useState(false);
  const close = { onSuccess: () => setOpen(false) };
  const save = useFormAction(saveLabSigner, initialFormState, close);
  const clear = useFormAction(saveLabSigner, initialFormState, close);
  const pending = save.pending || clear.pending;
  const nameId = `signer-name-${userId}`;
  const titleId = `signer-title-${userId}`;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="outline" size="sm" className="gap-1.5" />}
      >
        <SignatureIcon aria-hidden />
        Sign-off details
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Sign-off details</SheetTitle>
          <SheetDescription>
            How {name}&apos;s name and qualification print on every report they
            sign off, with the date and time. Reports already signed keep what
            they were signed with.
          </SheetDescription>
        </SheetHeader>
        {open && (
          <div className="grid gap-6 px-4 pb-6">
            <form
              method="post"
              onSubmit={save.onSubmit}
              className="grid gap-4"
              noValidate
            >
              <input type="hidden" name="userId" value={userId} />
              <FormField
                id={nameId}
                label="Name on reports"
                hint="e.g. Dr Ayesha Khan"
                error={save.fieldError("signerName")}
              >
                <Input
                  id={nameId}
                  name="signerName"
                  autoComplete="off"
                  maxLength={80}
                  defaultValue={signer?.name ?? ""}
                  {...fieldErrorProps(nameId, save.fieldError("signerName"))}
                />
              </FormField>
              <FormField
                id={titleId}
                label="Qualification"
                hint="e.g. MBBS, FCPS (Chemical Pathology), Consultant Pathologist"
                error={save.fieldError("signerTitle")}
              >
                <Input
                  id={titleId}
                  name="signerTitle"
                  autoComplete="off"
                  maxLength={120}
                  defaultValue={signer?.title ?? ""}
                  {...fieldErrorProps(titleId, save.fieldError("signerTitle"))}
                />
              </FormField>
              <div className="flex justify-end border-t pt-4">
                <Button type="submit" disabled={pending} className="gap-2">
                  {save.pending && (
                    <Loader2Icon className="animate-spin" aria-hidden />
                  )}
                  {save.pending ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
            {signer && (
              <form
                method="post"
                onSubmit={clear.onSubmit}
                className="grid gap-2 border-t pt-4"
              >
                <input type="hidden" name="userId" value={userId} />
                <input type="hidden" name="signerName" value="" />
                <input type="hidden" name="signerTitle" value="" />
                <input type="hidden" name="clear" value="1" />
                <p className="text-sm text-muted-foreground">
                  Without details, {name} can&apos;t sign off reports.
                </p>
                <Button
                  type="submit"
                  variant="outline"
                  disabled={pending}
                  className="w-fit"
                >
                  Remove details
                </Button>
              </form>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
