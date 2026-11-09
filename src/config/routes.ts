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
  // Opens the report on a short-lived signed link.
  labReport: (reportId: string) => `/patient/lab-tests/reports/${reportId}`,
  // One test compared across labs.
  labTest: (testId: string) => `/patient/lab-tests/book/${testId}`,
  // Booking at one lab, starting with the test or package the patient picked.
  bookLab: (labId: string, start?: { test?: string; package?: string }) => {
    const query = start?.test
      ? `?test=${start.test}`
      : start?.package
        ? `?package=${start.package}`
        : "";
    return `/patient/lab-tests/labs/${labId}${query}`;
  },
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
  messages: "/patient/messages",
  conversation: (conversationId: string) =>
    `/patient/messages/${conversationId}`,
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

export const publicRoutes = {
  labTests: "/lab-tests",
  labTest: (testId: string) => `/lab-tests/${testId}`,
} as const;

export function getPatientRouteFor(publicPath: string): string | undefined {
  const labTest = /^\/lab-tests\/([a-z0-9-]{1,40})$/.exec(publicPath);
  if (labTest) return patientRoutes.labTest(labTest[1]);
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
  conversation: (conversationId: string) =>
    `/doctor/messages/${conversationId}`,
  consultation: (appointmentId: string) =>
    `/doctor/consultation/${appointmentId}`,
  prescription: (appointmentId: string) =>
    `/doctor/appointments/${appointmentId}/prescription`,
} as const;

export const labRoutes = {
  home: "/lab",
  verification: "/lab/verification",
  tests: "/lab/tests",
  homeCollection: "/lab/home-collection",
  bookings: "/lab/bookings",
  reports: "/lab/reports",
  // Opens the report on a short-lived signed link.
  report: (reportId: string) => `/lab/reports/${reportId}`,
} as const;

export const adminRoutes = {
  home: "/admin",
  doctor: (doctorId: string) => `/admin/doctors/${doctorId}`,
  labs: "/admin/labs",
  lab: (labId: string) => `/admin/labs/${labId}`,
  auditLog: "/admin/audit-log",
} as const;
