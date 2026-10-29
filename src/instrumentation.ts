// Runs once when a server starts, before it handles requests. In production,
// refuse to start without the settings that email links depend on.
export async function register() {
  if (process.env.NODE_ENV !== "production") return;

  const { getSiteUrl } = await import("@/lib/env.server");
  getSiteUrl();
}
