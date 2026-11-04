// One page for every role, outside the role areas that redirect to it.
export const twoFactorRoute = "/two-factor";
export const consentRoute = "/consent";
// Opened from an email, so it works without signing in.
export const unsubscribeRoute = "/unsubscribe";

export const legalRoutes = {
  index: "/legal",
  document: (slug: string) => `/legal/${slug}`,
  privacy: "/legal/privacy",
  terms: "/legal/terms",
  telemedicineConsent: "/legal/telemedicine-consent",
  refunds: "/legal/refunds",
  partnerTerms: "/legal/partner-terms",
} as const;

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
  prescription: (prescriptionId: string) =>
    `/patient/prescriptions/${prescriptionId}`,
  talkToAi: "/patient/talk-to-ai",
  records: "/patient/records",
  // Opens the file on a short-lived signed link.
  recordDocument: (documentId: string) =>
    `/patient/records/documents/${documentId}`,
  settings: "/patient/settings",
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
  // Everything this doctor has for one patient they have seen.
  patientChart: (patientId: string) => `/doctor/patients/${patientId}`,
  availability: "/doctor/availability",
  profile: "/doctor/profile",
  verification: "/doctor/verification",
  messages: "/doctor/messages",
  consultation: (appointmentId: string) =>
    `/doctor/consultation/${appointmentId}`,
  prescription: (appointmentId: string) =>
    `/doctor/appointments/${appointmentId}/prescription`,
} as const;

export const adminRoutes = {
  home: "/admin",
  doctor: (doctorId: string) => `/admin/doctors/${doctorId}`,
  auditLog: "/admin/audit-log",
} as const;
