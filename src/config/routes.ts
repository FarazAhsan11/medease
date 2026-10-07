// Signed-in flows live inside each role's dashboard so the UI never switches
// to the public site mid-task. Public pages link here for booking actions.
export const patientRoutes = {
  home: "/patient",
  findDoctor: "/patient/find-doctor",
  bookDoctor: (doctorId: string) => `/patient/find-doctor/${doctorId}`,
  appointments: "/patient/appointments",
  labTests: "/patient/lab-tests",
  bookLabTests: "/patient/lab-tests/book",
  bookLabTest: (testId: string) => `/patient/lab-tests/book/${testId}`,
  medicines: "/patient/medicines",
  prescriptions: "/patient/prescriptions",
  talkToAi: "/patient/talk-to-ai",
  consultation: "/patient/consultation",
} as const;

export const doctorRoutes = {
  home: "/doctor",
  appointments: "/doctor/appointments",
  messages: "/doctor/messages",
  consultation: "/doctor/consultation",
} as const;
