import { cookies } from "next/headers";
import { BACKEND_URL, SESSION_COOKIE } from "@/lib/config";
import type { User } from "./types";

/** The backend couldn't be reached or failed. */
export class BackendUnavailableError extends Error {
  constructor(cause: unknown) {
    super("The backend is unavailable", { cause });
    this.name = "BackendUnavailableError";
  }
}

async function fetchMe(token: string): Promise<Response> {
  try {
    return await fetch(`${BACKEND_URL}/api/users/me`, {
      headers: { Cookie: `${SESSION_COOKIE}=${token}` },
      cache: "no-store",
    });
  } catch (error) {
    throw new BackendUnavailableError(error);
  }
}

/**
 * The signed-in user, checked with the backend, or null. Used by server
 * components: a cookie alone isn't trusted, because the temporary database
 * is reset whenever the backend restarts.
 * Throws BackendUnavailableError if the backend can't answer.
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const response = await fetchMe(token);
  if (response.status === 401) return null;
  if (!response.ok) throw new BackendUnavailableError(`status ${response.status}`);
  return (await response.json()) as User;
}
