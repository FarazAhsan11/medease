import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : "";
const realtime = supabase.replace(/^http/, "ws");

// Next's own inline scripts and styles need 'unsafe-inline'; nonces would make
// every page dynamic for little gain while nothing here renders user HTML.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase}`,
  "font-src 'self'",
  `connect-src 'self' ${supabase} ${realtime}${isDev ? " ws:" : ""}`,
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

// Calls are the only thing that needs the camera and microphone.
const consultationPermissions = [
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    // When two rules match, the later one wins for a header they share.
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/patient/consultation/:path*",
        headers: consultationPermissions,
      },
      {
        source: "/doctor/consultation/:path*",
        headers: consultationPermissions,
      },
    ];
  },
};

export default nextConfig;
