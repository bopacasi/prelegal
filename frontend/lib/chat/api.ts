import { apiFetch } from "@/lib/api/client";
import { todayIso } from "@/lib/nda/document";
import type { NdaValues } from "@/lib/nda/types";
import type { ChatMessage, NdaChatTurn } from "./types";

/**
 * Send the conversation and the current document; get the next turn. The
 * user's local date goes along, so "today" means the same to the assistant.
 */
export function sendNdaChat(messages: ChatMessage[], values: NdaValues): Promise<NdaChatTurn> {
  return apiFetch<NdaChatTurn>("/api/chat/nda", {
    method: "POST",
    body: JSON.stringify({ messages, values, today: todayIso() }),
  });
}
