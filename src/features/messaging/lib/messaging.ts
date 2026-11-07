import { doctorRoutes, patientRoutes } from "@/config/routes";

// MSG-01. Keep in step with the check on public.messages.
export const MESSAGE_MAX_LENGTH = 2000;
// MSG-04. Keep in step with private.patient_window_ends_at.
export const MESSAGE_WINDOW_DAYS = 7;
// How much of a conversation a page shows.
export const MESSAGES_SHOWN = 200;

export type MessagingRole = "patient" | "doctor";

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type Message = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export type ConversationRow = {
  id: string;
  doctor_id: string;
  patient_id: string;
  other_name: string | null;
  last_message_at: string | null;
  last_body: string | null;
  last_sender_id: string | null;
  unread: number;
  patient_window_ends_at: string | null;
  can_write: boolean;
};

export type Conversation = {
  id: string;
  doctorId: string;
  patientId: string;
  // The other person: the doctor for a patient, the patient for a doctor.
  otherId: string;
  otherName: string;
  lastMessageAt: string | null;
  lastBody: string | null;
  lastFromMe: boolean;
  unread: number;
  // When the patient can no longer write; null when they have no visit left.
  patientWindowEndsAt: string | null;
  // For the doctor's view of the window; worked out when loaded.
  patientCanWrite: boolean;
  canWrite: boolean;
};

export function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

export function toConversation(
  row: ConversationRow,
  role: MessagingRole,
  now = Date.now(),
): Conversation {
  const isDoctor = role === "doctor";
  const name = row.other_name?.trim();

  return {
    id: row.id,
    doctorId: row.doctor_id,
    patientId: row.patient_id,
    otherId: isDoctor ? row.patient_id : row.doctor_id,
    otherName: name
      ? isDoctor
        ? name
        : `Dr. ${name}`
      : isDoctor
        ? "Patient"
        : "Your doctor",
    lastMessageAt: row.last_message_at,
    lastBody: row.last_body,
    lastFromMe:
      row.last_sender_id !== null &&
      row.last_sender_id === (isDoctor ? row.doctor_id : row.patient_id),
    unread: row.unread,
    patientWindowEndsAt: row.patient_window_ends_at,
    patientCanWrite:
      row.patient_window_ends_at !== null &&
      new Date(row.patient_window_ends_at).getTime() > now,
    canWrite: row.can_write,
  };
}

// Messages arrive live and from the server; keep one copy of each, oldest first.
export function mergeMessages(current: Message[], incoming: Message[]) {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
}

// A live message moves its conversation to the top with the new preview and,
// if it's to this user, one more unread. Null when the conversation isn't in
// the list yet, so the caller loads the list.
export function withLiveMessage(
  items: Conversation[],
  message: MessageRow,
  userId: string,
): Conversation[] | null {
  const current = items.find((item) => item.id === message.conversation_id);
  if (!current) return null;

  const updated: Conversation = {
    ...current,
    lastBody: message.body,
    lastFromMe: message.sender_id === userId,
    lastMessageAt: message.created_at,
    unread: current.unread + (message.recipient_id === userId ? 1 : 0),
  };
  return [updated, ...items.filter((item) => item.id !== current.id)];
}

const GROUP_GAP_MS = 5 * 60 * 1000;

// Messages from one person a few minutes apart read as one run, with the time
// shown once at the end.
export function sameRun(
  earlier: Message | undefined,
  later: Message | undefined,
) {
  return (
    earlier !== undefined &&
    later !== undefined &&
    earlier.senderId === later.senderId &&
    Date.parse(later.createdAt) - Date.parse(earlier.createdAt) < GROUP_GAP_MS
  );
}

export const messagesRoutes = {
  patient: {
    inbox: patientRoutes.messages,
    conversation: patientRoutes.conversation,
  },
  doctor: {
    inbox: doctorRoutes.messages,
    conversation: doctorRoutes.conversation,
  },
} as const;

export const messageErrors: Record<string, string> = {
  not_allowed: "Only patients and doctors can send messages.",
  no_appointment:
    "Messaging opens once you have a booking together, and closes if every booking is cancelled.",
  not_participant: "We couldn't find that conversation.",
  invalid_message: `Write a message of up to ${MESSAGE_MAX_LENGTH} characters.`,
  window_closed:
    "Messaging with this doctor has closed. Book a visit to ask more.",
  not_doctor: "Only the doctor can change when the patient can write.",
  invalid_action: "Choose to extend or close messaging.",
};
