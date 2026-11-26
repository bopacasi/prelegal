import { Fragment, type ReactNode } from "react";
import type { Block, Inline, NdaDocument } from "@/lib/nda/types";

function Runs({ runs }: { runs: Inline[] }) {
  return runs.map((run, i) => {
    let node: ReactNode = run.text;
    if (run.bold) node = <strong>{node}</strong>;
    if (run.field) {
      node = (
        <span className="rounded-sm bg-sky-50 px-0.5 text-sky-900" title="Defined on the Cover Page">
          {node}
        </span>
      );
    }
    if (run.placeholder) {
      node = <mark className="rounded-sm bg-amber-100 px-0.5 text-amber-900">{node}</mark>;
    }
    if (run.href) {
      node = (
        <a href={run.href} target="_blank" rel="noreferrer" className="underline decoration-slate-400 underline-offset-2">
          {node}
        </a>
      );
    }
    return <Fragment key={i}>{node}</Fragment>;
  });
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "title":
      return (
        <h3
          className={`text-center text-xl font-bold ${
            block.pageBreakBefore ? "mt-10 border-t border-dashed border-slate-300 pt-10" : ""
          }`}
        >
          {block.text}
        </h3>
      );
    case "heading":
      return (
        <div className="mt-5">
          <h4 className="font-bold">{block.text}</h4>
          {block.hint && <p className="text-xs italic text-slate-500">{block.hint}</p>}
        </div>
      );
    case "paragraph":
      return (
        <p className={`whitespace-pre-line ${block.small ? "mt-6 text-xs text-slate-500" : "mt-1"}`}>
          <Runs runs={block.runs} />
        </p>
      );
    case "clause":
      return (
        <p className="mt-3 text-justify">
          {block.number}. <Runs runs={block.runs} />
        </p>
      );
    case "partyTable":
      return (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-1/4 border border-slate-400 p-2" />
                {block.headers.map((h) => (
                  <th key={h} className="border border-slate-400 p-2 text-center">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.label} className={row.tall ? "h-14" : undefined}>
                  <th scope="row" className="border border-slate-400 p-2 text-left align-top">
                    {row.label}
                    {row.hint && <span className="block text-xs font-normal italic text-slate-500">{row.hint}</span>}
                  </th>
                  {row.values.map((v, i) => (
                    <td key={i} className="whitespace-pre-line border border-slate-400 p-2 align-top">
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/** Renders the agreement as a page-like HTML preview. */
export function NdaPreview({ document }: { document: NdaDocument }) {
  return (
    <article className="rounded-xl bg-white px-6 py-8 font-serif text-[15px] leading-relaxed shadow-sm ring-1 ring-slate-200 sm:px-12 sm:py-12">
      {document.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </article>
  );
}
