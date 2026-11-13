"use server";

import { refresh } from "next/cache";

import { homeCollectionErrorMessages } from "@/features/home-collection/lib/home-collection";
import { collectionScheduleSchema } from "@/features/home-collection/schemas/home-collection";
import { requireLabMember } from "@/features/lab-staff/lib/lab-member.server";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import {
  isRateLimited,
  RATE_LIMITED_MESSAGE,
  rateLimits,
} from "@/lib/rate-limit.server";
import { createClient } from "@/lib/supabase/server";
import { parseRangesField } from "@/lib/weekly-hours";

// Saves the lab's collection hours and settings together. The function replaces
// the week in one transaction and keeps collection off without hours or a city.
export const saveCollectionSchedule = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = collectionScheduleSchema.safeParse({
      ranges: parseRangesField(formData.get("ranges")),
      slotMinutes: formData.get("slotMinutes"),
      capacity: formData.get("capacity"),
      noticeHours: formData.get("noticeHours"),
      freeAbove: formData.get("freeAbove") ?? "",
      accepting: formData.get("accepting"),
    });
    if (!parsed.success) {
      const rangeError = parsed.error.issues.find(
        (issue) => issue.path[0] === "ranges",
      );
      return rangeError
        ? formError(rangeError.message, "invalid_schedule")
        : validationError(parsed.error);
    }

    const { user } = await requireLabMember("home_collection");
    if (await isRateLimited(rateLimits.catalogUser, user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const schedule = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.rpc("save_lab_collection_schedule", {
      p_ranges: schedule.ranges,
      p_slot_minutes: schedule.slotMinutes,
      p_capacity: schedule.capacity,
      p_notice_hours: schedule.noticeHours,
      p_free_above: schedule.freeAbove,
      p_accepting: schedule.accepting,
    });
    if (error) {
      return databaseErrorState(
        error,
        homeCollectionErrorMessages,
        "Saving collection hours",
      );
    }

    refresh();
    return {
      status: "success",
      message: schedule.accepting
        ? "Saved. Home collection is on."
        : "Saved. Home collection is off.",
    };
  },
);
