import "server-only";

import { cookies } from "next/headers";

import { FLASH_COOKIE, flashSchema, type Flash } from "@/lib/flash";

// Messages are generic UI copy. Never put patient data in them: the cookie
// is readable by the browser so the client can clear it after showing it.
export async function setFlash(type: Flash["type"], message: string) {
  const cookieStore = await cookies();
  const flash: Flash = { id: crypto.randomUUID(), type, message };

  cookieStore.set(FLASH_COOKIE, JSON.stringify(flash), {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
  });
}

export async function getFlash(): Promise<Flash | null> {
  const value = (await cookies()).get(FLASH_COOKIE)?.value;
  if (!value) return null;

  try {
    const result = flashSchema.safeParse(JSON.parse(value));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
