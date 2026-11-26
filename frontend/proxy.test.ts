import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { SESSION_COOKIE } from "@/lib/config";
import { proxy } from "./proxy";

function request(path: string, cookie?: string) {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: cookie ? { cookie } : {},
  });
}

describe("proxy", () => {
  it("redirects to /login without a session cookie", () => {
    const response = proxy(request("/nda"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("lets requests with a session cookie through", () => {
    const response = proxy(request("/nda", `${SESSION_COOKIE}=abc`));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
