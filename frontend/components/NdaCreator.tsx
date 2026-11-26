"use client";

import { useEffect, useMemo, useState } from "react";
import { NdaForm } from "@/components/NdaForm";
import { NdaPreview } from "@/components/NdaPreview";
import { buildNdaDocument, defaultValues, documentFileName, todayIso } from "@/lib/nda/document";
import type { NdaValues, StandardTerms } from "@/lib/nda/types";

/** Holds the form state and shows the form next to a live preview. */
export function NdaCreator({ terms }: { terms: StandardTerms }) {
  const [values, setValues] = useState<NdaValues>(() => defaultValues());
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default the Effective Date to today. This runs after hydration, because
  // the server renders the page, and "today" there may differ from the user's.
  useEffect(() => {
    setValues((v) => (v.effectiveDate ? v : { ...v, effectiveDate: todayIso() }));
  }, []);

  const doc = useMemo(() => buildNdaDocument(values, terms), [values, terms]);

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      // Load the ODT writer (and JSZip) only when it's needed.
      const { buildOdtBlob } = await import("@/lib/nda/odt");
      const blob = await buildOdtBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = documentFileName(values);
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error(err);
      setError("The document couldn't be created. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
      <section aria-labelledby="form-heading" className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <h2 id="form-heading" className="text-lg font-semibold">
          Key terms
        </h2>
        <NdaForm values={values} onChange={setValues} />
      </section>

      <section aria-labelledby="preview-heading" className="lg:sticky lg:top-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="preview-heading" className="text-lg font-semibold">
            Preview
          </h2>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:opacity-60"
          >
            {downloading ? "Preparing…" : "Download (.odt)"}
          </button>
        </div>
        {error && (
          <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
            {error}
          </p>
        )}
        <NdaPreview document={doc} />
      </section>
    </div>
  );
}
