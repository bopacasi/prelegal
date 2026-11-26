/**
 * A run of inline text. Runs are combined to form paragraphs and clauses.
 */
export type Inline = {
  text: string;
  bold?: boolean;
  /** A term defined on the Cover Page, such as "Purpose" or "Governing Law". */
  field?: boolean;
  /** A value the user has not filled in yet, shown as "[Fill in …]". */
  placeholder?: boolean;
  href?: string;
};

/** One numbered clause of the Standard Terms. */
export type Clause = {
  number: number;
  runs: Inline[];
};

/** The Mutual NDA Standard Terms, parsed from the template Markdown. */
export type StandardTerms = {
  title: string;
  /** Standard Terms version, e.g. "1.0", taken from the template manifest. */
  version: string;
  clauses: Clause[];
  footer: Inline[];
};

export type PartyRow = {
  label: string;
  hint?: string;
  values: [string, string];
  /** Leave extra room so the row can be filled in by hand (e.g. signatures). */
  tall?: boolean;
};

/**
 * One block of the generated agreement. Both the HTML preview and the ODT
 * export render this model, so the download always matches the preview.
 */
export type Block =
  | { type: "title"; text: string; pageBreakBefore?: boolean }
  | { type: "heading"; text: string; hint?: string }
  | { type: "paragraph"; runs: Inline[]; small?: boolean }
  | { type: "clause"; number: number; runs: Inline[] }
  | { type: "partyTable"; headers: [string, string]; rows: PartyRow[] };

export type NdaDocument = Block[];

export type Party = {
  name: string;
  title: string;
  company: string;
  noticeAddress: string;
};

/** The key information the user enters in the form. */
export type NdaValues = {
  purpose: string;
  /** ISO date, YYYY-MM-DD. */
  effectiveDate: string;
  mndaTerm: "expires" | "untilTerminated";
  mndaTermYears: number;
  confidentialityTerm: "years" | "perpetual";
  confidentialityYears: number;
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
  parties: [Party, Party];
};
