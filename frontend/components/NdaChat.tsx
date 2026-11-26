"use client";

import { useEffect, useRef, useState, type Dispatch, type FormEvent, type KeyboardEvent, type SetStateAction } from "react";
import { MAX_MESSAGE_LENGTH, useNdaChat } from "@/lib/chat/useNdaChat";
import type { NdaValues } from "@/lib/nda/types";

const bubble = {
  user: "ml-8 self-end bg-sky-700 text-white",
  assistant: "mr-8 self-start bg-slate-100 text-slate-800",
};

type Props = { values: NdaValues; onChange: Dispatch<SetStateAction<NdaValues>> };

/** Chat with the assistant, which fills in the NDA from the conversation. */
export function NdaChat({ values, onChange }: Props) {
  const { messages, pending, error, send, retry } = useNdaChat(values, onChange);
  const [draft, setDraft] = useState("");
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages, pending]);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (pending || !draft.trim()) return;
    send(draft);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div
        ref={log}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="flex max-h-[60vh] min-h-48 flex-col gap-3 overflow-y-auto"
      >
        {messages.map((message, i) => (
          <p key={i} className={`whitespace-pre-line rounded-2xl px-4 py-2 text-sm ${bubble[message.role]}`}>
            {message.content}
          </p>
        ))}
        {pending && <p className="self-start text-sm italic text-slate-500">The assistant is typing…</p>}
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
          {error}
          <button type="button" onClick={retry} disabled={pending} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      <form onSubmit={submit} className="flex items-end gap-2">
        <textarea
          aria-label="Your message"
          rows={2}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Type your answer… (Shift+Enter for a new line)"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          className="block w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
        />
        <button
          type="submit"
          disabled={pending || !draft.trim()}
          className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-800 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
