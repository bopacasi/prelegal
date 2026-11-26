import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BACKEND_URL, SESSION_COOKIE } from "@/lib/config";
import { BackendUnavailableError, getCurrentUser } from "./server";

let token: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (token ? { value: token } : undefined) }),
}));

function mockFetch(impl: () => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  token = "abc";
});
afterEach(() => vi.unstubAllGlobals());

describe("getCurrentUser", () => {
  it("returns null without calling the backend when there's no cookie", async () => {
    token = undefined;
    const fetchMock = mockFetch(async () => new Response());
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks the backend with the session cookie and returns the user", async () => {
    const user = { id: 1, name: "Ada", email: "ada@example.com" };
    const fetchMock = mockFetch(async () => Response.json(user));
    await expect(getCurrentUser()).resolves.toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith(`${BACKEND_URL}/api/users/me`, {
      headers: { Cookie: `${SESSION_COOKIE}=abc` },
      cache: "no-store",
    });
  });

  it("returns null when the backend no longer knows the session", async () => {
    mockFetch(async () => new Response(null, { status: 401 }));
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("throws BackendUnavailableError when the backend fails", async () => {
    mockFetch(async () => new Response(null, { status: 502 }));
    await expect(getCurrentUser()).rejects.toBeInstanceOf(BackendUnavailableError);
  });

  it("throws BackendUnavailableError when the backend can't be reached", async () => {
    mockFetch(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(getCurrentUser()).rejects.toBeInstanceOf(BackendUnavailableError);
  });
});
