import { cookies } from "next/headers";
import { BACKEND_URL, SESSION_COOKIE } from "@/lib/config";
import type { User } from "./client";

/**
 * The signed-in user, checked with the backend, or null. Used by server
 * components: a cookie alone isn't trusted, because the temporary database
 * is reset whenever the backend restarts.
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const response = await fetch(`${BACKEND_URL}/api/users/me`, {
    headers: { Cookie: `${SESSION_COOKIE}=${token}` },
    cache: "no-store",
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`Backend returned ${response.status} for /api/users/me`);
  return (await response.json()) as User;
}
