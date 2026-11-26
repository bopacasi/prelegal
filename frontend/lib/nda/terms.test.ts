import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseInline, parseStandardTerms } from "./terms";

const TEMPLATE = readFileSync(
  new URL("../../../data/templates/mutual-nda/standard-terms.md", import.meta.url),
  "utf-8",
);

describe("parseInline", () => {
  it("splits bold, cover page references and links into runs", () => {
    expect(
      parseInline('**Term**. For the <span class="coverpage_link">Purpose</span>, see [site](https://x.test/a).'),
    ).toEqual([
      { text: "Term", bold: true },
      { text: ". For the " },
      { text: "Purpose", field: true },
      { text: ", see " },
      { text: "site", href: "https://x.test/a" },
      { text: "." },
    ]);
  });

  it("returns plain text unchanged", () => {
    expect(parseInline("No markup here.")).toEqual([{ text: "No markup here." }]);
  });
});

describe("parseStandardTerms (Mutual NDA template)", () => {
  const terms = parseStandardTerms(TEMPLATE, "1.0");

  it("finds the title and all 11 clauses in order", () => {
    expect(terms.title).toBe("Standard Terms");
    expect(terms.clauses.map((c) => c.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("parses clause headings and cover page references", () => {
    const intro = terms.clauses[0].runs;
    expect(intro[0]).toEqual({ text: "Introduction", bold: true });
    expect(intro).toContainEqual({ text: "Purpose", field: true });

    const fields = terms.clauses.flatMap((c) => c.runs.filter((r) => r.field).map((r) => r.text));
    expect(new Set(fields)).toEqual(
      new Set(["Purpose", "Effective Date", "MNDA Term", "Term of Confidentiality", "Governing Law", "Jurisdiction"]),
    );
  });

  it("keeps the license attribution as the footer", () => {
    expect(terms.footer).toContainEqual({ text: "CC BY 4.0", href: "https://creativecommons.org/licenses/by/4.0/" });
  });

  it("rejects text without clauses", () => {
    expect(() => parseStandardTerms("# Standard Terms\n\nJust a paragraph.", "1.0")).toThrow();
  });
});
