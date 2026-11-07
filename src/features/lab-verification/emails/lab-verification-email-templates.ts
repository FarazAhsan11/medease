import { renderEmail } from "@/lib/render-email";

export function labVerifiedEmail(url: string) {
  return renderEmail({
    subject: "Your MedEase lab is verified",
    preview: "Patients can now find your lab on MedEase.",
    heading: "Your lab is verified",
    paragraphs: [
      "Hi there,",
      "Our team has checked your licence. Patients can now find your lab on MedEase.",
    ],
    action: { label: "Open your dashboard", url },
  });
}
