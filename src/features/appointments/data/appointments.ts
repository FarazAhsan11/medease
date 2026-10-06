export type Appointment = {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  fee: number;
  rating?: number;
};

export const upcomingAppointments: Appointment[] = [
  {
    id: "apt-101",
    doctorName: "Dr. Nida Ali",
    specialty: "General Practitioner",
    date: "Fri, Oct 9, 2026",
    time: "11:30 AM",
    fee: 2000,
  },
  {
    id: "apt-102",
    doctorName: "Dr. Ayesha Khan",
    specialty: "Cardiologist",
    date: "Tue, Oct 13, 2026",
    time: "2:00 PM",
    fee: 5000,
  },
];

export const pastAppointments: Appointment[] = [
  {
    id: "apt-087",
    doctorName: "Dr. Asim Raza",
    specialty: "Neurologist",
    date: "Sun, Mar 2, 2025",
    time: "2:00 PM",
    fee: 1500,
    rating: 4,
  },
  {
    id: "apt-064",
    doctorName: "Dr. Sana Tariq",
    specialty: "Dermatologist",
    date: "Mon, Jan 13, 2025",
    time: "12:30 PM",
    fee: 3500,
    rating: 5,
  },
];
