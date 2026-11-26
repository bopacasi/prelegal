// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { StrictMode, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { defaultValues } from "@/lib/nda/document";
import { sendNdaChat } from "./api";
import { useNdaChat } from "./useNdaChat";

vi.mock("./api", () => ({ sendNdaChat: vi.fn() }));
const send = vi.mocked(sendNdaChat);

function renderChat() {
  return renderHook(
    () => {
      const [values, setValues] = useState(defaultValues("2026-11-26"));
      return { values, chat: useNdaChat(values, setValues) };
    },
    { wrapper: StrictMode },
  );
}

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({ reply: "Hi! What's the purpose?", updates: {} });
});

describe("useNdaChat", () => {
  it("asks for the greeting exactly once, even in StrictMode", async () => {
    const { result } = renderChat();
    await waitFor(() => expect(result.current.chat.messages).toHaveLength(1));
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith([], expect.objectContaining({ effectiveDate: "2026-11-26" }));
    expect(result.current.chat.messages[0]).toEqual({ role: "assistant", content: "Hi! What's the purpose?" });
  });

  it("sends the history and applies the assistant's updates", async () => {
    const { result } = renderChat();
    await waitFor(() => expect(result.current.chat.messages).toHaveLength(1));
    send.mockResolvedValueOnce({ reply: "Got it.", updates: { governingLaw: "Delaware", party1: { company: "Acme" } } });

    act(() => result.current.chat.send("  Delaware law, Acme Inc.  "));

    await waitFor(() => expect(result.current.chat.messages).toHaveLength(3));
    expect(send).toHaveBeenLastCalledWith(
      [
        { role: "assistant", content: "Hi! What's the purpose?" },
        { role: "user", content: "Delaware law, Acme Inc." },
      ],
      expect.anything(),
    );
    expect(result.current.values.governingLaw).toBe("Delaware");
    expect(result.current.values.parties[0].company).toBe("Acme");
    expect(result.current.chat.pending).toBe(false);
  });

  it("ignores blank messages", async () => {
    const { result } = renderChat();
    await waitFor(() => expect(result.current.chat.messages).toHaveLength(1));
    act(() => result.current.chat.send("   "));
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("keeps the document unchanged on failure and can retry", async () => {
    const { result } = renderChat();
    await waitFor(() => expect(result.current.chat.messages).toHaveLength(1));
    const before = result.current.values;
    send.mockRejectedValueOnce(new ApiError(502));

    act(() => result.current.chat.send("Delaware"));
    await waitFor(() => expect(result.current.chat.error).toMatch(/unavailable/));
    expect(result.current.values).toBe(before);
    expect(result.current.chat.messages.at(-1)).toEqual({ role: "user", content: "Delaware" });

    send.mockResolvedValueOnce({ reply: "Noted.", updates: { governingLaw: "Delaware" } });
    act(() => result.current.chat.retry());
    await waitFor(() => expect(result.current.chat.messages).toHaveLength(3));
    expect(result.current.chat.error).toBeNull();
    expect(result.current.values.governingLaw).toBe("Delaware");
  });

  it("tells the user to sign in again when the session has ended", async () => {
    send.mockRejectedValueOnce(new ApiError(401));
    const { result } = renderChat();
    await waitFor(() => expect(result.current.chat.error).toMatch(/sign in again/));
  });
});
