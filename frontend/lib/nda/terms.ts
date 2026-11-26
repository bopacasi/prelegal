import type { Clause, Inline, StandardTerms } from "./types";

// Inline markup used in Common Paper templates:
//   **bold**  |  <span class="coverpage_link">Term</span>  |  [text](url)
const INLINE_RE =
  /\*\*(.+?)\*\*|<span class="coverpage_link">(.+?)<\/span>|\[([^\]]+)\]\(([^)\s]+)\)/g;
const CLAUSE_RE = /^(\d+)\.\s+(.*)$/;

/** Split one line of template Markdown into inline runs. */
export function parseInline(source: string): Inline[] {
  const runs: Inline[] = [];
  let last = 0;
  for (const match of source.matchAll(INLINE_RE)) {
    const index = match.index ?? 0;
    if (index > last) runs.push({ text: source.slice(last, index) });
    const [whole, bold, field, linkText, href] = match;
    if (bold !== undefined) runs.push({ text: bold, bold: true });
    else if (field !== undefined) runs.push({ text: field, field: true });
    else runs.push({ text: linkText, href });
    last = index + whole.length;
  }
  if (last < source.length) runs.push({ text: source.slice(last) });
  return runs;
}

/**
 * Parse the Standard Terms Markdown: a "# Title" line, numbered clauses
 * ("1. **Introduction**. …"), and any other lines, which form the footer.
 */
export function parseStandardTerms(
  markdown: string,
  version: string,
): StandardTerms {
  let title = "Standard Terms";
  const clauses: Clause[] = [];
  const footer: Inline[] = [];

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("# ")) {
      title = line.slice(2).trim();
      continue;
    }
    const clause = CLAUSE_RE.exec(line);
    if (clause) {
      clauses.push({ number: Number(clause[1]), runs: parseInline(clause[2]) });
    } else {
      if (footer.length > 0) footer.push({ text: " " });
      footer.push(...parseInline(line));
    }
  }

  if (clauses.length === 0) {
    throw new Error("No numbered clauses found in the Standard Terms template");
  }
  return { title, version, clauses, footer };
}
