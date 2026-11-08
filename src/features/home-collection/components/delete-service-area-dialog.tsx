"use client";

import { Loader2Icon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteServiceArea } from "@/features/home-collection/actions/delete-service-area";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type DeleteServiceAreaDialogProps = {
  areaId: string;
  city: string;
};

export function DeleteServiceAreaDialog({
  areaId,
  city,
}: DeleteServiceAreaDialogProps) {
  const [open, setOpen] = useState(false);
  const { pending, onSubmit } = useFormAction(
    deleteServiceArea,
    initialFormState,
    { onSuccess: () => setOpen(false) },
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            size="icon-sm"
            variant="ghost"
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Remove ${city}`}
          />
        }
      >
        <Trash2Icon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form method="post" onSubmit={onSubmit} className="grid gap-4">
          <input type="hidden" name="id" value={areaId} />
          <AlertDialogHeader>
            <AlertDialogTitle>Stop collecting in {city}?</AlertDialogTitle>
            <AlertDialogDescription>
              Patients there can no longer book home collection with you.
              Bookings already made stay as they are.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Keep</AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              disabled={pending}
              className="gap-2"
            >
              {pending && <Loader2Icon className="animate-spin" aria-hidden />}
              {pending ? "Removing…" : "Remove"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
