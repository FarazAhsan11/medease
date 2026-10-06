export type Doctor = {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  location: string;
  experience: string;
  consultationFee: number;
  rating: number;
  availableNow: boolean;
  phone: string;
  email: string;
};

export const doctors: Doctor[] = [
  {
    id: "nida-ali",
    firstName: "Nida",
    lastName: "Ali",
    specialty: "General Practitioner",
    location: "Lahore, Punjab",
    experience: "10 years in practice",
    consultationFee: 3000,
    rating: 4.9,
    availableNow: true,
    phone: "+92 300 1234567",
    email: "nida.ali@medease.com",
  },
  {
    id: "ayesha-khan",
    firstName: "Ayesha",
    lastName: "Khan",
    specialty: "Cardiologist",
    location: "Karachi, Sindh",
    experience: "12 years in practice",
    consultationFee: 5000,
    rating: 4.8,
    availableNow: true,
    phone: "+92 300 7654321",
    email: "ayesha.khan@medease.com",
  },
  {
    id: "asim-raza",
    firstName: "Asim",
    lastName: "Raza",
    specialty: "Neurologist",
    location: "Islamabad, Capital Territory",
    experience: "8 years in practice",
    consultationFee: 4000,
    rating: 4.7,
    availableNow: false,
    phone: "+92 300 1122334",
    email: "asim.raza@medease.com",
  },
  {
    id: "sana-tariq",
    firstName: "Sana",
    lastName: "Tariq",
    specialty: "Dermatologist",
    location: "Rawalpindi, Punjab",
    experience: "7 years in practice",
    consultationFee: 3500,
    rating: 4.6,
    availableNow: true,
    phone: "+92 300 5566778",
    email: "sana.tariq@medease.com",
  },
  {
    id: "faisal-ahmed",
    firstName: "Faisal",
    lastName: "Ahmed",
    specialty: "Orthopedic Surgeon",
    location: "Faisalabad, Punjab",
    experience: "15 years in practice",
    consultationFee: 6000,
    rating: 4.9,
    availableNow: true,
    phone: "+92 300 9988776",
    email: "faisal.ahmed@medease.com",
  },
  {
    id: "sara-malik",
    firstName: "Sara",
    lastName: "Malik",
    specialty: "Pediatrician",
    location: "Multan, Punjab",
    experience: "5 years in practice",
    consultationFee: 2000,
    rating: 4.5,
    availableNow: false,
    phone: "+92 300 1324354",
    email: "sara.malik@medease.com",
  },
  {
    id: "usman-shah",
    firstName: "Usman",
    lastName: "Shah",
    specialty: "Cardiologist",
    location: "Lahore, Punjab",
    experience: "9 years in practice",
    consultationFee: 4500,
    rating: 4.7,
    availableNow: true,
    phone: "+92 300 1111111",
    email: "usman.shah@medease.com",
  },
];

export const doctorTypes = [
  "General Practitioner",
  "Cardiologist",
  "Neurologist",
  "Dermatologist",
  "Orthopedic Surgeon",
  "Pediatrician",
];

export const DOCTORS_PER_PAGE = 6;

export function getDoctorById(id: string) {
  return doctors.find((doctor) => doctor.id === id);
}
