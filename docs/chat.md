# Chat features

Two separate chat features are planned. They share UI ideas but not data or rules.

- **AI health assistant**: a patient talks to an AI that helps them understand symptoms and find the right specialist.
- **Doctor–patient messaging**: a patient and a doctor they have booked with send each other messages.

Both handle sensitive health information: never log message content, never put it in URLs, never store it in browser storage, and enforce access on the server and with RLS.

## AI health assistant

### What exists today

`src/features/chat/` has the UI only: `chat-panel` (with a `locked` mode for guests), `chat-header`, `chat-empty-state` with suggestion prompts, and `chat-composer` (not wired to anything). Pages: `(site)/talk-to-ai` (locked, guests are sent to log in) and `patient/talk-to-ai`. The UI is branded "CareDoc"; rename to MedEase.

### What it does

1. The patient describes symptoms in plain language.
2. The assistant asks a few follow-up questions (how long, how severe, age, other symptoms).
3. It gives general guidance, clearly not a diagnosis, and suggests which kind of specialist to see.
4. It shows matching doctors from our directory with a link to book.
5. If the patient describes emergency signs (chest pain, trouble breathing, stroke signs, severe bleeding, thoughts of self-harm), it stops triage and tells them to contact emergency services right away.

### How to build it

- **Model access**: use the AI SDK with a streaming chat model through the Vercel AI Gateway (one key, model fallbacks, zero data retention option). Choose the exact model when implementing; keep the model id in one config file. API keys go in `.env.example` / `src/lib/env.server.ts`.
- **Endpoint**: a streaming Route Handler (e.g. `src/app/api/chat/route.ts`) that calls `requireRole("patient")` first, validates the request body with Zod (message count and length limits), then streams the model reply. Guests get 401.
- **System prompt**: lives in `src/features/chat/lib/`. Covers the role (guidance, not diagnosis), the follow-up-questions style, the emergency rules, staying on health topics, and keeping answers short.
- **Tools the model can call**:
  - `recommendSpecialist`: returns one of our known specializations (the same list used by the doctor directory filters), so the answer always maps to real doctors.
  - `findDoctors`: queries the doctor directory by specialization and returns a few doctors; the UI renders them as `doctor-card`s with a "Book" link to `patient/find-doctor/[doctorId]`.
- **Emergency check**: besides the prompt rules, run a simple keyword check on the server before calling the model and show a fixed emergency banner when it matches, so this never depends on the model alone.
- **Client**: make `chat-composer` and the message list the smallest `"use client"` leaves (AI SDK `useChat`). Suggestions in the empty state send their text as the first message. "New chat" clears the conversation.
- **Rate limit**: cap messages per patient per day (a small `ai_usage` table updated by a SECURITY DEFINER function), and cap conversation length.

### Storing conversations

- **Version 1: no storage.** The conversation lives only in memory on the page and is gone on refresh or "New chat". Simplest and safest.
- **Version 2 (optional)**: `ai_conversations` and `ai_messages` tables, readable only by the owning patient (RLS), with a "Delete conversation" action and an automatic retention period. Only add this if patients ask for history.
- **Share with doctor (optional)**: when booking from a chat suggestion, offer to prefill the booking reason with a short AI-written symptom summary. The patient sees and can edit it before booking; nothing is shared without that step.

### Done when

- A signed-in patient chats and gets streamed replies; guests still see the locked panel.
- Emergency phrases always show the emergency banner.
- The assistant's specialist suggestion shows real doctors who can be booked.
- No message content appears in server logs.

## Doctor–patient messaging

### What exists today

The doctor messages page uses mock threads from `src/features/doctor-dashboard/data/dashboard.ts` with `messages-inbox`, `thread-list-item`, `conversation-view` and `recent-messages-card`. There is no patient messages page. Realtime private channels are already used for video calls (`call:<appointment id>` guarded by policies on `realtime.messages`).

### What it does

- A patient can message a doctor they have at least one non-cancelled appointment with. One conversation per doctor–patient pair.
- Both sides see new messages live, with unread counts in the header notifications menu and on the doctor overview.
- Text only at first; attachments later (reusing the patient documents bucket from roadmap item 2).

### How to build it

- **Database** (new migration):
  - `conversations`: `id`, `doctor_id`, `patient_id`, `last_message_at`, unique on (`doctor_id`, `patient_id`).
  - `messages`: `id`, `conversation_id`, `sender_id`, `body` (1 to 2000 characters), `created_at`, `read_at`.
  - RLS: only the two participants can read. No direct inserts or updates.
  - `send_message(doctor_or_patient_id, body)`: SECURITY DEFINER; checks the caller is a participant and that the pair has an appointment, creates the conversation if needed, inserts the message, updates `last_message_at`.
  - `mark_conversation_read(conversation_id)`: sets `read_at` on the other person's messages.
- **Realtime**: a database trigger broadcasts each new message to the private channel `conversation:<id>`, with `realtime.messages` policies that allow only participants, the same way the call channel is protected. The client subscribes on the open conversation and on a per-user channel for unread counts.
- **Code layout**: new `src/features/messaging/` (`actions/`, `components/`, `data/`, `schemas/`). Move `messages-inbox`, `thread-list-item` and `conversation-view` there from `doctor-dashboard` so both roles use them. The composer and live list are the client leaves; the thread list renders on the server.
- **Pages**: replace mock data on `doctor/messages` and in `recent-messages-card`; add `patient/messages` with a nav link in `src/config/dashboards.ts` and a route in `src/config/routes.ts`; add a "Message doctor" button on the patient's appointment card.
- **Notifications**: unread count in `notifications-menu`. Later: email the recipient if a message stays unread for a while, without the message text in the email.

### Done when

- A patient with an appointment can message that doctor; a patient without one cannot (checked in the database function, not just the UI).
- New messages appear live on both sides and unread counts update.
- A third user cannot read the conversation, through the API or Realtime.
