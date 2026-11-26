import { NdaCreator } from "@/components/NdaCreator";
import { loadStandardTerms } from "@/lib/nda/load";

/** Reads the Mutual NDA template from data/templates/ when the page is built. */
export default async function Home() {
  const terms = await loadStandardTerms("mutual-nda");

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Prelegal</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Mutual NDA Creator</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Fill in the key terms and the agreement updates as you type. When it looks right,
          download it as an OpenDocument file to review and sign.
        </p>
      </header>
      <NdaCreator terms={terms} />
    </main>
  );
}
