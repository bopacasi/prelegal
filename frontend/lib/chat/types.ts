import type { NdaValues, Party } from "@/lib/nda/types";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type PartyUpdates = Partial<Party>;

/** Fields the assistant changed in one turn; anything absent stays as it is. */
export type NdaUpdates = Partial<Omit<NdaValues, "parties">> & {
  party1?: PartyUpdates;
  party2?: PartyUpdates;
};

/** One assistant turn, as returned by POST /api/chat/nda. */
export type NdaChatTurn = { reply: string; updates: NdaUpdates };
