import type { Block, Inline, NdaDocument, NdaValues, Party, StandardTerms } from "./types";

export const DEFAULT_PURPOSE =
  "Evaluating whether to enter into a business relationship with the other party.";

const emptyParty = { name: "", title: "", company: "", noticeAddress: "" };

/** Form defaults, taken from the Common Paper cover page template. */
export function defaultValues(effectiveDate = ""): NdaValues {
  return {
    purpose: DEFAULT_PURPOSE,
    effectiveDate,
    mndaTerm: "expires",
    mndaTermYears: 1,
    confidentialityTerm: "years",
    confidentialityYears: 1,
    governingLaw: "",
    jurisdiction: "",
    modifications: "",
    parties: [{ ...emptyParty }, { ...emptyParty }],
  };
}

/** Today's date as YYYY-MM-DD in the user's local time zone. */
export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "2026-11-26" → "November 26, 2026". Returns "" for invalid input. */
export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "";
  const [, y, m, d] = match.map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function value(text: string, placeholder: string): Inline {
  const trimmed = text.trim();
  return trimmed ? { text: trimmed } : { text: `[${placeholder}]`, placeholder: true };
}

function years(count: number): Inline {
  if (!Number.isInteger(count) || count < 1) {
    return { text: "[number of years]", placeholder: true };
  }
  return { text: `${count} year${count === 1 ? "" : "s"}` };
}

function coverPage(values: NdaValues, terms: StandardTerms): Block[] {
  const standardUrl = `https://commonpaper.com/standards/mutual-nda/${terms.version}`;
  const both = (key: keyof Party): [string, string] => [
    values.parties[0][key].trim(),
    values.parties[1][key].trim(),
  ];
  const date = formatDate(values.effectiveDate);

  return [
    { type: "title", text: "Mutual Non-Disclosure Agreement" },
    { type: "heading", text: "Using this Mutual Non-Disclosure Agreement" },
    {
      type: "paragraph",
      runs: [
        { text: "This Mutual Non-Disclosure Agreement (the “MNDA”) consists of: (1) this Cover Page (“" },
        { text: "Cover Page", bold: true },
        { text: `”) and (2) the Common Paper Mutual NDA Standard Terms Version ${terms.version} (“` },
        { text: "Standard Terms", bold: true },
        { text: "”) identical to those posted at " },
        { text: standardUrl.replace("https://", ""), href: standardUrl },
        {
          text: ". Any modifications of the Standard Terms should be made on the Cover Page, which will control over conflicts with the Standard Terms.",
        },
      ],
    },

    { type: "heading", text: "Purpose", hint: "How Confidential Information may be used" },
    { type: "paragraph", runs: [value(values.purpose, "Fill in purpose")] },

    { type: "heading", text: "Effective Date" },
    { type: "paragraph", runs: [date ? { text: date } : { text: "[Fill in date]", placeholder: true }] },

    { type: "heading", text: "MNDA Term", hint: "The length of this MNDA" },
    {
      type: "paragraph",
      runs:
        values.mndaTerm === "expires"
          ? [{ text: "Expires " }, years(values.mndaTermYears), { text: " from Effective Date." }]
          : [{ text: "Continues until terminated in accordance with the terms of the MNDA." }],
    },

    { type: "heading", text: "Term of Confidentiality", hint: "How long Confidential Information is protected" },
    {
      type: "paragraph",
      runs:
        values.confidentialityTerm === "years"
          ? [
              years(values.confidentialityYears),
              {
                text: " from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.",
              },
            ]
          : [{ text: "In perpetuity." }],
    },

    { type: "heading", text: "Governing Law & Jurisdiction" },
    { type: "paragraph", runs: [{ text: "Governing Law: " }, value(values.governingLaw, "Fill in state")] },
    {
      type: "paragraph",
      runs: [{ text: "Jurisdiction: " }, value(values.jurisdiction, "Fill in city or county and state")],
    },

    { type: "heading", text: "MNDA Modifications" },
    { type: "paragraph", runs: [{ text: values.modifications.trim() || "None." }] },

    {
      type: "paragraph",
      runs: [{ text: "By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date." }],
    },
    {
      type: "partyTable",
      headers: ["Party 1", "Party 2"],
      rows: [
        // Signature and Date are left blank to be completed when signing.
        { label: "Signature", values: ["", ""], tall: true },
        { label: "Print Name", values: both("name") },
        { label: "Title", values: both("title") },
        { label: "Company", values: both("company") },
        { label: "Notice Address", hint: "Use either email or postal address", values: both("noticeAddress") },
        { label: "Date", values: ["", ""] },
      ],
    },
    {
      type: "paragraph",
      small: true,
      runs: [
        { text: `Common Paper Mutual Non-Disclosure Agreement (Version ${terms.version}) free to use under ` },
        { text: "CC BY 4.0", href: "https://creativecommons.org/licenses/by/4.0/" },
        { text: "." },
      ],
    },
  ];
}

/**
 * Build the complete agreement: the filled-in Cover Page, followed by the
 * Standard Terms on a new page. References to Cover Page terms in the
 * Standard Terms (e.g. "the Purpose") are kept, as in the original agreement.
 */
export function buildNdaDocument(values: NdaValues, terms: StandardTerms): NdaDocument {
  return [
    ...coverPage(values, terms),
    { type: "title", text: terms.title, pageBreakBefore: true },
    ...terms.clauses.map((c): Block => ({ type: "clause", number: c.number, runs: c.runs })),
    { type: "paragraph", small: true, runs: terms.footer },
  ];
}

/** A download file name such as "Mutual-NDA-Acme-Inc-Globex.odt". */
export function documentFileName(values: NdaValues, extension = "odt"): string {
  const companies = values.parties
    .map((p) => p.company.trim().replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, ""))
    .filter(Boolean);
  return [`Mutual-NDA`, ...companies].join("-") + `.${extension}`;
}
