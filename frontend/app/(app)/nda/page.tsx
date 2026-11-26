import type { Metadata } from "next";
import { NdaCreator } from "@/components/NdaCreator";
import { loadStandardTerms } from "@/lib/nda/load";

export const metadata: Metadata = { title: "Mutual NDA Creator" };

/** The Mutual NDA creator, with the template read from data/templates/. */
export default async function NdaPage() {
  const terms = await loadStandardTerms("mutual-nda");

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Mutual NDA Creator</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Tell the assistant about your agreement and it fills in the NDA as you chat. When it
          looks right, download it as an OpenDocument file to review and sign.
        </p>
      </header>
      <NdaCreator terms={terms} />
    </main>
  );
}
