// The wording lives here, not in the database: rows hold only a kind and a link,
// so no name or health detail is ever stored in a notification.

const titles = {
  appointment_booked: "Your appointment is booked",
  appointment_new: "You have a new appointment",
  appointment_cancelled: "An appointment was cancelled",
  appointment_reminder: "You have an appointment coming up",
  prescription_issued: "You have a new prescription",
  prescription_updated: "Your prescription was updated",
  prescription_cancelled: "A prescription was cancelled",
  verification_approved: "Your profile is verified",
  verification_needs_info: "We need more information from you",
  verification_rejected: "Your verification has an update",
  visit_summary_ready: "Your visit summary is ready",
  visit_summary_updated: "Your visit summary was updated",
  lab_booking_booked: "Your lab test is booked",
  lab_booking_new: "You have a new lab booking",
  lab_booking_sample_collected: "Your lab sample was collected",
  lab_booking_processing: "The lab is testing your sample",
  lab_booking_report_ready: "Your lab report is ready",
  lab_booking_recollection_needed: "The lab needs a new sample",
  lab_booking_cancelled: "A lab booking was cancelled",
  lab_booking_rescheduled: "A lab booking moved to a new time",
} as const;

export type NotificationKind = keyof typeof titles;

export type NotificationRow = {
  id: string;
  kind: NotificationKind;
  href: string;
  read_at: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  title: string;
  href: string;
  unread: boolean;
  createdAt: string;
};

export type NotificationFeed = {
  items: Notification[];
  unread: number;
};

export const NOTIFICATIONS_SHOWN = 10;

export function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    // A kind this build doesn't know yet still shows something sensible.
    title: titles[row.kind] ?? "You have an update",
    href: row.href,
    unread: row.read_at === null,
    createdAt: row.created_at,
  };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// "5 min ago"
export function timeAgo(value: string, now = Date.now()) {
  const elapsed = now - new Date(value).getTime();

  if (elapsed < MINUTE) return "Just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min ago`;
  if (elapsed < DAY) {
    const hours = Math.floor(elapsed / HOUR);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(elapsed / DAY);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
