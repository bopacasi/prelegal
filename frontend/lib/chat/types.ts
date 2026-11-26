import type { NdaValues, Party } from "@/lib/nda/types";

/** Longest chat message; must match ChatMessage in backend/app/chat/schemas.py. */
export const MAX_MESSAGE_LENGTH = 4000;

/**
 * Most recent messages sent with each turn (the backend accepts up to 100).
 * The current NDA values are always sent in full, so older messages add little.
 */
export const MAX_HISTORY = 40;

export type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * Fields the assistant changed in one turn; anything absent stays as it is.
 * Mirrors NdaUpdates in backend/app/chat/schemas.py (dates as YYYY-MM-DD).
 */
export type NdaUpdates = Partial<Omit<NdaValues, "parties">> & {
  party1?: Partial<Party>;
  party2?: Partial<Party>;
};

/** One assistant turn, as returned by POST /api/chat/nda. */
export type NdaChatTurn = { reply: string; updates: NdaUpdates };
