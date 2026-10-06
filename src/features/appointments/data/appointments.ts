export type Appointment = {
  id: string;
  doctorName: string;
  patientName: string;
  dateTime: string;
  consultationFee: number;
};

export const upcomingAppointments: Appointment[] = [
  {
    id: "apt-101",
    doctorName: "Nida Ali",
    patientName: "Ali Raza",
    dateTime: "October 9, 2026 - 11:30 AM",
    consultationFee: 2000,
  },
];

export const pastAppointments: Appointment[] = [
  {
    id: "apt-087",
    doctorName: "Asim Raza",
    patientName: "Ali Raza",
    dateTime: "March 2, 2025 - 2:00 PM",
    consultationFee: 1500,
  },
];
