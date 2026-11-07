import { renderEmail } from "@/lib/render-email";

// The admin's note stays behind sign-in, so this only points to the app.
export function verificationApprovedEmail(url: string) {
  return renderEmail({
    subject: "Your MedEase account is verified",
    preview: "Patients can now find you on MedEase.",
    heading: "You're verified",
    paragraphs: [
      "Hi there,",
      "Our team has checked your details. Patients can now find you on MedEase and book any open hours you've set.",
    ],
    action: { label: "Open your dashboard", url },
  });
}
