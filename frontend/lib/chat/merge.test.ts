import { describe, expect, it } from "vitest";
import { defaultValues } from "@/lib/nda/document";
import { applyUpdates } from "./merge";

const base = () => ({
  ...defaultValues("2026-11-26"),
  governingLaw: "Delaware",
  parties: [
    { name: "Ada", title: "CEO", company: "Acme", noticeAddress: "ada@acme.test" },
    { name: "", title: "", company: "Globex", noticeAddress: "" },
  ] as [ReturnType<typeof defaultValues>["parties"][0], ReturnType<typeof defaultValues>["parties"][1]],
});

describe("applyUpdates", () => {
  it("changes only the fields in the update", () => {
    const values = base();
    const result = applyUpdates(values, { jurisdiction: "courts in New Castle, DE", mndaTermYears: 3 });
    expect(result).toEqual({ ...values, jurisdiction: "courts in New Castle, DE", mndaTermYears: 3 });
  });

  it("merges partial party updates into the right party", () => {
    const values = base();
    const result = applyUpdates(values, { party2: { name: "Alan Turing" }, party1: { title: "CTO" } });
    expect(result.parties).toEqual([
      { ...values.parties[0], title: "CTO" },
      { ...values.parties[1], name: "Alan Turing" },
    ]);
  });

  it("ignores null and undefined values", () => {
    const values = base();
    const updates = { governingLaw: null, purpose: undefined, party1: { company: null } } as never;
    expect(applyUpdates(values, updates)).toEqual(values);
  });

  it("returns a new object and leaves the input untouched", () => {
    const values = base();
    const snapshot = structuredClone(values);
    const result = applyUpdates(values, { party1: { name: "Ada King" } });
    expect(result).not.toBe(values);
    expect(result.parties).not.toBe(values.parties);
    expect(values).toEqual(snapshot);
  });
});
