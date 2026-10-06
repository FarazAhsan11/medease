export type Doctor = {
  id: string;
  name: string;
  specialty: string;
  location: string;
  experienceYears: number;
  consultationFee: number;
  rating: number;
  reviews: number;
  availableNow: boolean;
  phone: string;
  email: string;
};

export const doctors: Doctor[] = [
  {
    id: "nida-ali",
    name: "Dr. Nida Ali",
    specialty: "General Practitioner",
    location: "Lahore, Punjab",
    experienceYears: 10,
    consultationFee: 3000,
    rating: 4.9,
    reviews: 214,
    availableNow: true,
    phone: "+92 300 1234567",
    email: "nida.ali@medease.com",
  },
  {
    id: "ayesha-khan",
    name: "Dr. Ayesha Khan",
    specialty: "Cardiologist",
    location: "Karachi, Sindh",
    experienceYears: 12,
    consultationFee: 5000,
    rating: 4.8,
    reviews: 186,
    availableNow: true,
    phone: "+92 300 7654321",
    email: "ayesha.khan@medease.com",
  },
  {
    id: "asim-raza",
    name: "Dr. Asim Raza",
    specialty: "Neurologist",
    location: "Islamabad, Capital Territory",
    experienceYears: 8,
    consultationFee: 4000,
    rating: 4.7,
    reviews: 132,
    availableNow: false,
    phone: "+92 300 1122334",
    email: "asim.raza@medease.com",
  },
  {
    id: "sana-tariq",
    name: "Dr. Sana Tariq",
    specialty: "Dermatologist",
    location: "Rawalpindi, Punjab",
    experienceYears: 7,
    consultationFee: 3500,
    rating: 4.6,
    reviews: 98,
    availableNow: true,
    phone: "+92 300 5566778",
    email: "sana.tariq@medease.com",
  },
  {
    id: "faisal-ahmed",
    name: "Dr. Faisal Ahmed",
    specialty: "Orthopedic Surgeon",
    location: "Faisalabad, Punjab",
    experienceYears: 15,
    consultationFee: 6000,
    rating: 4.9,
    reviews: 251,
    availableNow: false,
    phone: "+92 300 9988776",
    email: "faisal.ahmed@medease.com",
  },
  {
    id: "sara-malik",
    name: "Dr. Sara Malik",
    specialty: "Pediatrician",
    location: "Multan, Punjab",
    experienceYears: 5,
    consultationFee: 2000,
    rating: 4.5,
    reviews: 77,
    availableNow: true,
    phone: "+92 300 1324354",
    email: "sara.malik@medease.com",
  },
  {
    id: "usman-shah",
    name: "Dr. Usman Shah",
    specialty: "Cardiologist",
    location: "Lahore, Punjab",
    experienceYears: 9,
    consultationFee: 4500,
    rating: 4.7,
    reviews: 143,
    availableNow: true,
    phone: "+92 300 1111111",
    email: "usman.shah@medease.com",
  },
];

export const specialties = [
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
