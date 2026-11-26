// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendNdaChat } from "@/lib/chat/api";
import { defaultValues } from "@/lib/nda/document";
import { NdaChat } from "./NdaChat";

vi.mock("@/lib/chat/api", () => ({ sendNdaChat: vi.fn() }));
const send = vi.mocked(sendNdaChat);

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({ reply: "Hi! What's the purpose?", updates: {} });
  // jsdom has no layout, so element scrolling is a no-op stub.
  Element.prototype.scrollTo = vi.fn();
});
afterEach(cleanup);

function renderChat() {
  render(<NdaChat values={defaultValues("2026-11-26")} onChange={vi.fn()} />);
  return { input: screen.getByRole("textbox", { name: "Your message" }), user: userEvent.setup() };
}

describe("NdaChat", () => {
  it("shows the assistant's greeting", async () => {
    renderChat();
    expect(await screen.findByText("Hi! What's the purpose?")).toBeTruthy();
  });

  it("sends with Enter and adds a new line with Shift+Enter", async () => {
    const { input, user } = renderChat();
    await screen.findByText("Hi! What's the purpose?");
    send.mockResolvedValueOnce({ reply: "Got it.", updates: {} });

    await user.type(input, "Exploring a partnership{Shift>}{Enter}{/Shift}with Globex");
    expect(send).toHaveBeenCalledTimes(1);
    await user.keyboard("{Enter}");

    expect(await screen.findByText("Got it.")).toBeTruthy();
    expect(screen.getByText("Exploring a partnership\nwith Globex", { collapseWhitespace: false })).toBeTruthy();
    expect((input as HTMLTextAreaElement).value).toBe("");
  });

  it("disables sending while the assistant is answering", async () => {
    send.mockReturnValueOnce(new Promise(() => {}));
    const { input, user } = renderChat();
    await user.type(input, "Hello");
    expect(screen.getByText("The assistant is typing…")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Send" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows an error with a Retry button", async () => {
    send.mockRejectedValueOnce(new Error("network"));
    const { user } = renderChat();
    expect(await screen.findByRole("alert")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Hi! What's the purpose?")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
