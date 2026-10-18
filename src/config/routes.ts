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
  consultation: (appointmentId: string) =>
    `/patient/consultation/${appointmentId}`,
} as const;

// Public browse pages and the patient page with the full feature. The proxy
// sends signed-in patients straight to theirs so they never see the guest one.
const patientRoutesByPublicPath: Record<string, string> = {
  "/find-doctor": patientRoutes.findDoctor,
  "/lab-tests": patientRoutes.bookLabTests,
  "/medicines": patientRoutes.medicines,
  "/talk-to-ai": patientRoutes.talkToAi,
};

export function getPatientRouteFor(publicPath: string): string | undefined {
  return patientRoutesByPublicPath[publicPath];
}

export const doctorRoutes = {
  home: "/doctor",
  appointments: "/doctor/appointments",
  patients: "/doctor/patients",
  availability: "/doctor/availability",
  profile: "/doctor/profile",
  messages: "/doctor/messages",
  consultation: (appointmentId: string) =>
    `/doctor/consultation/${appointmentId}`,
} as const;
