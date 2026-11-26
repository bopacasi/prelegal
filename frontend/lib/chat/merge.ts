import type { NdaValues, Party } from "@/lib/nda/types";
import type { NdaUpdates, PartyUpdates } from "./types";

/** The entries of an object whose value isn't null or undefined. */
function present<T extends object>(updates: T): Partial<T> {
  return Object.fromEntries(Object.entries(updates).filter(([, value]) => value != null)) as Partial<T>;
}

function mergeParty(party: Party, updates: PartyUpdates = {}): Party {
  return { ...party, ...present(updates) };
}

/**
 * Apply the assistant's updates to the document. The backend has already
 * validated them; this only merges, leaving every other field as it was.
 */
export function applyUpdates(values: NdaValues, updates: NdaUpdates): NdaValues {
  const { party1, party2, ...fields } = updates;
  return {
    ...values,
    ...present(fields),
    parties: [mergeParty(values.parties[0], party1), mergeParty(values.parties[1], party2)],
  };
}
