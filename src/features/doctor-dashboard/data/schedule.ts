export type ScheduleStatus = "Upcoming" | "Completed" | "Cancelled";

export type ScheduledVisit = {
  id: string;
  patientName: string;
  reason: string;
  date: string;
  time: string;
  type: "Video" | "In clinic";
  status: ScheduleStatus;
};

export const scheduleStatuses: ScheduleStatus[] = [
  "Upcoming",
  "Completed",
  "Cancelled",
];

export const scheduledVisits: ScheduledVisit[] = [
  {
    id: "v-1",
    patientName: "Sadia Bano",
    reason: "Stomach pain",
    date: "Wed, Oct 7",
    time: "10:00 AM",
    type: "In clinic",
    status: "Upcoming",
  },
  {
    id: "v-2",
    patientName: "Shabna Firdos",
    reason: "Follow-up: blood pressure",
    date: "Wed, Oct 7",
    time: "11:00 AM",
    type: "Video",
    status: "Upcoming",
  },
  {
    id: "v-3",
    patientName: "Ali Khan",
    reason: "Headache",
    date: "Wed, Oct 7",
    time: "12:00 PM",
    type: "Video",
    status: "Upcoming",
  },
  {
    id: "v-4",
    patientName: "Ali Raza",
    reason: "General check-up",
    date: "Fri, Oct 9",
    time: "11:30 AM",
    type: "Video",
    status: "Upcoming",
  },
  {
    id: "v-5",
    patientName: "Hina Siddiqui",
    reason: "Seasonal allergies",
    date: "Mon, Oct 5",
    time: "2:30 PM",
    type: "In clinic",
    status: "Completed",
  },
  {
    id: "v-6",
    patientName: "Bilal Ahmed",
    reason: "Fever and sore throat",
    date: "Mon, Oct 5",
    time: "3:00 PM",
    type: "Video",
    status: "Completed",
  },
  {
    id: "v-7",
    patientName: "Zara Hussain",
    reason: "Back pain",
    date: "Tue, Oct 6",
    time: "12:30 PM",
    type: "In clinic",
    status: "Cancelled",
  },
];
