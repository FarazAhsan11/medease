// Sample data for doctor messages until messaging is built.
export type ChatMessage = {
  id: string;
  from: "patient" | "doctor";
  text: string;
  time: string;
};

export type MessageThread = {
  id: string;
  patientName: string;
  preview: string;
  time: string;
  unread: boolean;
  messages: ChatMessage[];
};

export const messageThreads: MessageThread[] = [
  {
    id: "thread-1",
    patientName: "Shabna Firdos",
    preview: "Hi Doctor, I have a question about my prescription.",
    time: "10:15 AM",
    unread: true,
    messages: [
      {
        id: "m1",
        from: "doctor",
        text: "Your blood pressure readings look much better this week.",
        time: "Yesterday, 4:20 PM",
      },
      {
        id: "m2",
        from: "patient",
        text: "Thank you! I've been taking the medicine every morning.",
        time: "Yesterday, 4:35 PM",
      },
      {
        id: "m3",
        from: "patient",
        text: "Hi Doctor, I have a question about my prescription. Can I take it with food?",
        time: "10:15 AM",
      },
    ],
  },
  {
    id: "thread-2",
    patientName: "Ali Khan",
    preview: "Can we reschedule my appointment?",
    time: "9:30 AM",
    unread: false,
    messages: [
      {
        id: "m1",
        from: "patient",
        text: "Can we reschedule my appointment to next week?",
        time: "9:30 AM",
      },
    ],
  },
  {
    id: "thread-3",
    patientName: "Sadia Bano",
    preview: "The stomach pain has eased since yesterday.",
    time: "Mon",
    unread: false,
    messages: [
      {
        id: "m1",
        from: "patient",
        text: "The stomach pain has eased since yesterday.",
        time: "Mon, 6:10 PM",
      },
      {
        id: "m2",
        from: "doctor",
        text: "Good to hear. Keep up the fluids and light meals for a few days.",
        time: "Mon, 6:45 PM",
      },
    ],
  },
];
