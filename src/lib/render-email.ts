import { siteConfig } from "@/config/site";

// Mirrors the tokens in globals.css; email clients can't read CSS variables.
const colors = {
  primary: "#1782a3",
  primaryForeground: "#ffffff",
  background: "#f7f9fb",
  card: "#ffffff",
  foreground: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  secondary: "#eaf5f9",
};

const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

type EmailParts = {
  subject: string;
  // Inbox preview line shown next to the subject.
  preview: string;
  heading: string;
  paragraphs: string[];
  action?: { label: string; url: string };
  code?: string;
  footnote?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Table-based layout with inline styles so it renders in Gmail, Outlook and
// Apple Mail. Every value passed in is plain text and gets escaped here.
export function renderEmail({
  subject,
  preview,
  heading,
  paragraphs,
  action,
  code,
  footnote,
}: EmailParts): EmailContent {
  const e = escapeHtml;

  const button = action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;"><tr><td style="border-radius:10px;background:${colors.primary};">
        <a href="${e(action.url)}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:${colors.primaryForeground};text-decoration:none;border-radius:10px;">${e(action.label)}</a>
      </td></tr></table>
      <p style="margin:0 0 4px;font-size:12px;line-height:18px;color:${colors.muted};">Button not working? Paste this link into your browser:</p>
      <p style="margin:0;font-size:12px;line-height:18px;word-break:break-all;"><a href="${e(action.url)}" style="color:${colors.primary};">${e(action.url)}</a></p>`
    : "";

  const codeBlock = code
    ? `<p style="margin:8px 0 20px;padding:14px 0;border-radius:10px;background:${colors.secondary};text-align:center;font-size:28px;font-weight:600;letter-spacing:8px;color:${colors.foreground};">${e(code)}</p>`
    : "";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${colors.background};font-family:${font};color:${colors.foreground};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${e(preview)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.background};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="padding:0 4px 20px;font-size:18px;font-weight:600;color:${colors.foreground};">
  <span style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:8px;background:${colors.primary};color:${colors.primaryForeground};text-align:center;font-size:14px;">&#10010;</span>
  &nbsp;${e(siteConfig.name)}
</td></tr>
<tr><td style="background:${colors.card};border:1px solid ${colors.border};border-radius:16px;padding:32px;">
  <h1 style="margin:0 0 16px;font-size:20px;line-height:28px;font-weight:600;color:${colors.foreground};">${e(heading)}</h1>
  ${paragraphs.map((paragraph) => `<p style="margin:0 0 16px;font-size:14px;line-height:22px;color:${colors.foreground};">${e(paragraph)}</p>`).join("\n  ")}
  ${codeBlock}
  ${button}
  ${footnote ? `<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid ${colors.border};font-size:12px;line-height:18px;color:${colors.muted};">${e(footnote)}</p>` : ""}
</td></tr>
<tr><td style="padding:20px 4px 0;font-size:12px;line-height:18px;color:${colors.muted};text-align:center;">
  ${e(siteConfig.name)} &middot; ${e(siteConfig.tagline)}<br>Not a substitute for professional medical advice.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    heading,
    "",
    ...paragraphs.flatMap((paragraph) => [paragraph, ""]),
    ...(code ? [code, ""] : []),
    ...(action ? [`${action.label}: ${action.url}`, ""] : []),
    ...(footnote ? [footnote, ""] : []),
    `${siteConfig.name} · ${siteConfig.tagline}`,
  ].join("\n");

  return { subject, html, text };
}
