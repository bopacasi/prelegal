import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, login, logout } from "./client";

function mockFetch(status: number, body?: unknown) {
  const fetchMock = vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("apiFetch", () => {
  it("returns parsed JSON and sends JSON headers", async () => {
    const fetchMock = mockFetch(200, { ok: true });
    await expect(apiFetch("/api/x", { headers: { "X-Test": "1" } })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("/api/x", {
      headers: { "Content-Type": "application/json", "X-Test": "1" },
    });
  });

  it("returns undefined for 204 No Content", async () => {
    mockFetch(204);
    await expect(apiFetch("/api/x")).resolves.toBeUndefined();
  });

  it("throws ApiError with the status for failed requests", async () => {
    mockFetch(422, { detail: "bad" });
    await expect(apiFetch("/api/x")).rejects.toEqual(new ApiError(422));
  });
});

describe("login and logout", () => {
  it("posts the name and email to the login endpoint", async () => {
    const user = { id: 1, name: "Ada", email: "ada@example.com" };
    const fetchMock = mockFetch(200, user);
    await expect(login("Ada", "ada@example.com")).resolves.toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ name: "Ada", email: "ada@example.com" }) }),
    );
  });

  it("posts to the logout endpoint", async () => {
    const fetchMock = mockFetch(204);
    await logout();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", expect.objectContaining({ method: "POST" }));
  });
});
