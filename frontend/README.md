# Prelegal frontend: Mutual NDA Creator

A Next.js prototype for creating a Mutual Non-Disclosure Agreement ([KAN-5](https://bogdanlangendorf.atlassian.net/browse/KAN-5)). The user fills in the key terms in a form, sees the complete agreement update as they type, and downloads it as an OpenDocument Text (`.odt`) file. The file opens in LibreOffice, Microsoft Word, Google Docs and Apple Pages.

## Getting started

You need Node.js 20 or later.

```console
cd frontend
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run build` | Production build. The template is read and the page is rendered at this point. |
| `npm start` | Serve the production build. |
| `npm test` | Run the unit tests (Vitest). |
| `npm run typecheck` | Check types with `tsc`. |

## How it works

The agreement is a filled-in **Cover Page** followed by Common Paper's **Mutual NDA Standard Terms**, which come from the template dataset in [`../data/templates`](../data/templates). The app must run from `frontend/` with `data/` next to it, because the template is read from there at build time.

```
app/page.tsx            Server component: loads the Standard Terms at build time
components/NdaCreator   Client component: form state, live preview, download
components/NdaForm      The key-terms form
components/NdaPreview   Renders the document as HTML
lib/nda/load.ts         Finds the template through data/templates/manifest.json and reads it
lib/nda/terms.ts        Parses the template Markdown into clauses and inline runs
lib/nda/document.ts     Builds the document model from the form values
lib/nda/odt.ts          Writes the document model as an .odt file (with JSZip)
```

The HTML preview and the `.odt` export both render the same document model (`lib/nda/types.ts`), so the download always matches the preview. Values that haven't been filled in yet show as highlighted placeholders, such as **[Fill in state]**. References to Cover Page terms in the Standard Terms (e.g. "the Purpose") are kept as written, as in the original agreement, and are highlighted in the preview.

Everything runs in the browser, and nothing the user types is sent to a server.

## License

The Mutual NDA text is © Common Paper, Inc., licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Generated documents keep Common Paper's attribution.
