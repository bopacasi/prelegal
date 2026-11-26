import { apiFetch } from "@/lib/api/client";
import type { NdaValues } from "@/lib/nda/types";
import type { ChatMessage, NdaChatTurn } from "./types";

/** Send the conversation so far and the current document; get the next turn. */
export function sendNdaChat(messages: ChatMessage[], values: NdaValues): Promise<NdaChatTurn> {
  return apiFetch<NdaChatTurn>("/api/chat/nda", {
    method: "POST",
    body: JSON.stringify({ messages, values }),
  });
}
