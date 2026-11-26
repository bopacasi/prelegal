import { afterEach, expect, it, vi } from "vitest";
import { defaultValues } from "@/lib/nda/document";
import { sendNdaChat } from "./api";

afterEach(() => vi.unstubAllGlobals());

it("posts the messages, current values and the user's date to the chat endpoint", async () => {
  const turn = { reply: "Hi!", updates: {} };
  const fetchMock = vi.fn(async () => Response.json(turn));
  vi.stubGlobal("fetch", fetchMock);
  const values = defaultValues("2026-11-26");
  const messages = [{ role: "user" as const, content: "Hello" }];

  vi.useFakeTimers({ now: new Date(2027, 0, 1, 23, 30) }); // late evening, local time

  await expect(sendNdaChat(messages, values)).resolves.toEqual(turn);
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/chat/nda",
    expect.objectContaining({ method: "POST", body: JSON.stringify({ messages, values, today: "2027-01-01" }) }),
  );
  vi.useRealTimers();
});
