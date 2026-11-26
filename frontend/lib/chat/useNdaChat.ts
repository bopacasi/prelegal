"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ApiError } from "@/lib/api/client";
import type { NdaValues } from "@/lib/nda/types";
import { sendNdaChat } from "./api";
import { applyUpdates } from "./merge";
import type { ChatMessage } from "./types";

export const MAX_MESSAGE_LENGTH = 4000;

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
  const valuesRef = useRef(values);
  const started = useRef(false);

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  const runTurn = useCallback(
    async (history: ChatMessage[]) => {
      setPending(true);
      setError(null);
      try {
        const turn = await sendNdaChat(history, valuesRef.current);
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

  // Ask for the greeting once (React's StrictMode runs effects twice in development).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void runTurn([]);
  }, [runTurn]);

  function send(text: string) {
    const content = text.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!content || pending) return;
    const history: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(history);
    void runTurn(history);
  }

  function retry() {
    void runTurn(messages);
  }

  return { messages, pending, error, send, retry };
}
