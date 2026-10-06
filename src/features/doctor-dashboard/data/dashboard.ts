export type PatientAppointment = {
  id: string;
  patientName: string;
  reason: string;
  time: string;
  age: number;
  gender: string;
  history: string;
};

export type PatientMessage = {
  id: string;
  sender: string;
  message: string;
  time: string;
};

export type DoctorProfile = {
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  address: string;
  email: string;
  phone: string;
  specialization: string;
  licenseNumber: string;
  memberSince: string;
};

export const patientAppointments: PatientAppointment[] = [
  {
    id: "pa-1",
    patientName: "Sadiabano",
    reason: "Stomach pain",
    time: "10:00 AM",
    age: 25,
    gender: "Female",
    history: "No significant history",
  },
  {
    id: "pa-2",
    patientName: "Shabna Firdos",
    reason: "Stomach pain",
    time: "11:00 AM",
    age: 30,
    gender: "Female",
    history: "Hypertension",
  },
  {
    id: "pa-3",
    patientName: "Ali Khan",
    reason: "Headache",
    time: "12:00 PM",
    age: 40,
    gender: "Male",
    history: "Migraine",
  },
];

export const patientMessages: PatientMessage[] = [
  {
    id: "msg-1",
    sender: "Shabna Firdos",
    message: "Hi Doctor, I have a question about my prescription.",
    time: "10:15 AM",
  },
  {
    id: "msg-2",
    sender: "Ali Khan",
    message: "Can we reschedule my appointment?",
    time: "11:30 AM",
  },
];

export const doctorProfile: DoctorProfile = {
  firstName: "Nida",
  lastName: "Ali",
  age: 38,
  gender: "Female",
  address: "Lahore, Punjab",
  email: "nida.ali@medease.com",
  phone: "+92 300 1234567",
  specialization: "Cardiologist",
  licenseNumber: "PMC-12345",
  memberSince: "1/10/2025",
};
