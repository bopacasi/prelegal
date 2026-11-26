import { describe, expect, it } from "vitest";
import { buildNdaDocument, defaultValues, documentFileName, formatDate, todayIso } from "./document";
import type { Block, Inline, NdaValues, StandardTerms } from "./types";

const TERMS: StandardTerms = {
  title: "Standard Terms",
  version: "1.0",
  clauses: [{ number: 1, runs: [{ text: "Intro", bold: true }, { text: " for the " }, { text: "Purpose", field: true }] }],
  footer: [{ text: "Footer" }],
};

function filled(overrides: Partial<NdaValues> = {}): NdaValues {
  return {
    ...defaultValues("2026-11-26"),
    governingLaw: "Delaware",
    jurisdiction: "courts located in New Castle, DE",
    parties: [
      { name: "Ada Lovelace", title: "CEO", company: "Acme, Inc.", noticeAddress: "ada@acme.test" },
      { name: "Alan Turing", title: "CTO", company: "Globex", noticeAddress: "1 Main St\nSpringfield" },
    ],
    ...overrides,
  };
}

const text = (runs: Inline[]) => runs.map((r) => r.text).join("");

/** The paragraph that follows the heading with the given text. */
function sectionText(doc: Block[], heading: string): string {
  const i = doc.findIndex((b) => b.type === "heading" && b.text === heading);
  const next = doc[i + 1];
  if (i < 0 || next?.type !== "paragraph") throw new Error(`No section "${heading}"`);
  return text(next.runs);
}

describe("formatDate", () => {
  it("formats ISO dates in US style without time zone shifts", () => {
    expect(formatDate("2026-11-26")).toBe("November 26, 2026");
    expect(formatDate("2027-01-01")).toBe("January 1, 2027");
  });

  it("returns an empty string for missing or invalid dates", () => {
    expect(formatDate("")).toBe("");
    expect(formatDate("26/11/2026")).toBe("");
  });
});

describe("todayIso", () => {
  it("uses the local calendar date", () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("buildNdaDocument", () => {
  it("fills in the cover page from the form values", () => {
    const doc = buildNdaDocument(filled(), TERMS);
    expect(sectionText(doc, "Effective Date")).toBe("November 26, 2026");
    expect(sectionText(doc, "MNDA Term")).toBe("Expires 1 year from Effective Date.");
    expect(sectionText(doc, "Term of Confidentiality")).toMatch(/^1 year from Effective Date, but in the case of trade secrets/);
    expect(sectionText(doc, "MNDA Modifications")).toBe("None.");

    const table = doc.find((b) => b.type === "partyTable");
    expect(table?.type === "partyTable" && table.rows.find((r) => r.label === "Company")?.values).toEqual([
      "Acme, Inc.",
      "Globex",
    ]);
  });

  it("supports multi-year and open-ended terms", () => {
    const doc = buildNdaDocument(
      filled({ mndaTermYears: 3, confidentialityTerm: "perpetual" }),
      TERMS,
    );
    expect(sectionText(doc, "MNDA Term")).toBe("Expires 3 years from Effective Date.");
    expect(sectionText(doc, "Term of Confidentiality")).toBe("In perpetuity.");

    const untilTerminated = buildNdaDocument(filled({ mndaTerm: "untilTerminated" }), TERMS);
    expect(sectionText(untilTerminated, "MNDA Term")).toBe(
      "Continues until terminated in accordance with the terms of the MNDA.",
    );
  });

  it("marks missing values as placeholders", () => {
    const doc = buildNdaDocument({ ...defaultValues(), mndaTermYears: Number.NaN }, TERMS);
    const placeholders = doc.flatMap((b) => ("runs" in b ? b.runs : [])).filter((r) => r.placeholder);
    expect(placeholders.map((r) => r.text)).toEqual([
      "[Fill in date]",
      "[number of years]",
      "[Fill in state]",
      "[Fill in city or county and state]",
    ]);
  });

  it("appends the Standard Terms on a new page", () => {
    const doc = buildNdaDocument(filled(), TERMS);
    const titleIndex = doc.findIndex((b) => b.type === "title" && b.pageBreakBefore);
    expect(doc[titleIndex]).toEqual({ type: "title", text: "Standard Terms", pageBreakBefore: true });
    expect(doc[titleIndex + 1]).toEqual({ type: "clause", number: 1, runs: TERMS.clauses[0].runs });
    expect(doc.at(-1)).toEqual({ type: "paragraph", small: true, runs: TERMS.footer });
  });
});

describe("documentFileName", () => {
  it("names the file after both companies", () => {
    expect(documentFileName(filled())).toBe("Mutual-NDA-Acme-Inc-Globex.odt");
  });

  it("falls back to a generic name", () => {
    expect(documentFileName(defaultValues())).toBe("Mutual-NDA.odt");
  });
});
