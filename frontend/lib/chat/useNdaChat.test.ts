// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { StrictMode, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { defaultValues } from "@/lib/nda/document";
import { sendNdaChat } from "./api";
import { MAX_HISTORY } from "./types";
import { useNdaChat } from "./useNdaChat";

vi.mock("./api", () => ({ sendNdaChat: vi.fn() }));
const send = vi.mocked(sendNdaChat);

function renderChat(effectiveDate = "2026-11-26") {
  return renderHook(
    () => {
      const [values, setValues] = useState(defaultValues(effectiveDate));
      return { values, setValues, chat: useNdaChat(values, setValues) };
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

  it("waits for the effective date before greeting", async () => {
    const { result } = renderChat("");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(send).not.toHaveBeenCalled();

    act(() => result.current.setValues((v) => ({ ...v, effectiveDate: "2026-11-26" })));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(send).toHaveBeenCalledWith([], expect.objectContaining({ effectiveDate: "2026-11-26" }));
  });

  it("sends only the most recent messages in long conversations", async () => {
    const { result } = renderChat();
    await waitFor(() => expect(result.current.chat.messages).toHaveLength(1));
    for (let i = 1; i <= 25; i++) {
      send.mockResolvedValueOnce({ reply: `Answer ${i}`, updates: {} });
      act(() => result.current.chat.send(`Question ${i}`));
      await waitFor(() => expect(result.current.chat.messages).toHaveLength(1 + 2 * i));
    }
    const lastHistory = send.mock.calls.at(-1)![0];
    expect(lastHistory).toHaveLength(MAX_HISTORY);
    expect(lastHistory.at(-1)).toEqual({ role: "user", content: "Question 25" });
    expect(result.current.chat.messages).toHaveLength(51); // the page still shows everything
  });
});
