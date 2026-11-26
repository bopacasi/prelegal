"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ApiError } from "@/lib/api/client";
import type { NdaValues } from "@/lib/nda/types";
import { sendNdaChat } from "./api";
import { applyUpdates } from "./merge";
import { MAX_HISTORY, MAX_MESSAGE_LENGTH, type ChatMessage } from "./types";

function errorMessage(error: unknown): string {
  return error instanceof ApiError && error.status === 401
    ? "Your session has ended. Please sign in again."
    : "The assistant is unavailable right now. Please try again.";
}

/**
 * The chat with the NDA assistant. The assistant speaks first; each reply can
 * update the document. A failed turn leaves the document unchanged and can be
 * retried.
 */
export function useNdaChat(values: NdaValues, setValues: Dispatch<SetStateAction<NdaValues>>) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valuesRef = useRef(values); // the latest values, without restarting the greeting effect
  const started = useRef(false);

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  const runTurn = useCallback(
    async (history: ChatMessage[]) => {
      setPending(true);
      setError(null);
      try {
        const turn = await sendNdaChat(history.slice(-MAX_HISTORY), valuesRef.current);
        setValues((current) => applyUpdates(current, turn.updates));
        setMessages([...history, { role: "assistant", content: turn.reply }]);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setPending(false);
      }
    },
    [setValues],
  );

  // Greet once (StrictMode runs effects twice in development), after the page
  // has defaulted the Effective Date, so the assistant doesn't ask for it.
  const ready = values.effectiveDate !== "";
  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    void runTurn([]);
  }, [ready, runTurn]);

  /** Send a message; returns false if there was nothing to send or a turn is running. */
  function send(text: string): boolean {
    const content = text.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!content || pending) return false;
    const history: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(history);
    void runTurn(history);
    return true;
  }

  function retry() {
    void runTurn(messages);
  }

  return { messages, pending, error, send, retry };
}
