import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseStandardTerms } from "./terms";
import type { StandardTerms } from "./types";

/**
 * The template dataset lives in data/templates/ at the repo root. The app runs
 * from frontend/, so by default it's one level up from the working directory.
 * The Docker image sets TEMPLATES_DIR instead.
 */
const TEMPLATES_DIR =
  process.env.TEMPLATES_DIR ?? path.join(process.cwd(), "..", "data", "templates");

type Manifest = {
  templates: {
    slug: string;
    version: string | null;
    files: { role: string; path: string }[];
  }[];
};

/**
 * Load and parse a template's Standard Terms, using the manifest to find the
 * file. Server-only: runs when Next.js renders the page.
 */
export async function loadStandardTerms(
  slug = "mutual-nda",
): Promise<StandardTerms> {
  const manifest = JSON.parse(
    await readFile(path.join(TEMPLATES_DIR, "manifest.json"), "utf-8"),
  ) as Manifest;

  const template = manifest.templates.find((t) => t.slug === slug);
  const file = template?.files.find((f) => f.role === "standard_terms");
  if (!template || !file) {
    throw new Error(`Template "${slug}" has no standard terms in the manifest`);
  }

  const markdown = await readFile(path.join(TEMPLATES_DIR, file.path), "utf-8");
  return parseStandardTerms(markdown, template.version ?? "1.0");
}
