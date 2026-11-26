# Prelegal frontend

The Next.js app for Prelegal. It has a placeholder sign-in page and, behind it, the Mutual NDA creator ([KAN-5](https://bogdanlangendorf.atlassian.net/browse/KAN-5)). In the NDA creator the user fills in the key terms in a form, sees the complete agreement update as they type, and downloads it as an OpenDocument Text (`.odt`) file. The file opens in LibreOffice, Microsoft Word, Google Docs and Apple Pages.

The app needs the FastAPI backend in [`../backend`](../backend). Start the whole stack from the repo root with `scripts/start.sh`; see the [root README](../README.md).

## Development

All commands run in Docker from the **repo root**, because the image needs both `frontend/` and `data/`:

```console
# Type check and unit tests
docker build -f frontend/Dockerfile --target test -t prelegal-frontend-test .
docker run --rm prelegal-frontend-test
```

With Node.js 20.9 or later installed, the usual scripts work in `frontend/` too: `npm run dev`, `build`, `start`, `test` and `typecheck`. `npm run dev` expects the backend at `http://localhost:8000` (set `BACKEND_URL` to change it).

The production image runs the [standalone](https://nextjs.org/docs/app/api-reference/config/next-config-js/output) Next.js server on `node:24-alpine` as the non-root `node` user.

## Structure

```
app/(public)/login      Sign-in page (fake login: any name and email)
app/(app)/layout.tsx    Signed-in area: checks the session with the backend, renders the app shell
app/(app)/nda           The Mutual NDA creator
proxy.ts                Sends requests without a session cookie to /login
next.config.ts          Rewrites /api/* to the backend (BACKEND_URL, fixed at build time)
lib/api/client.ts       Browser calls to the backend: login, logout
lib/api/server.ts       getCurrentUser() for server components
components/shell        App header with "Signed in as …" and Sign out
components/login        The sign-in form
components/Nda*         NDA creator: form state, form, preview
lib/nda/                NDA logic: template loading and parsing, document model, .odt export
```

### Sessions

1. Signing in posts the name and email to `/api/auth/login`. The backend creates a session and sets the `prelegal_session` cookie (`HttpOnly`).
2. `proxy.ts` sends any request without that cookie to `/login`. It's only a quick check.
3. The `(app)` layout then asks the backend who the user is (`/api/users/me`). If the session no longer exists, for example because the backend restarted with an empty database, it redirects to `/login`.

## How the NDA creator works

The agreement is a filled-in **Cover Page** followed by Common Paper's **Mutual NDA Standard Terms**, which come from the template dataset in [`../data/templates`](../data/templates) (or `TEMPLATES_DIR`).

```
components/NdaCreator   Client component: form state, live preview, download
components/NdaForm      The key-terms form
components/NdaPreview   Renders the document as HTML
lib/nda/load.ts         Finds the template through data/templates/manifest.json and reads it
lib/nda/terms.ts        Parses the template Markdown into clauses and inline runs
lib/nda/document.ts     Builds the document model from the form values
lib/nda/odt.ts          Writes the document model as an .odt file (with JSZip)
```

The HTML preview and the `.odt` export both render the same document model (`lib/nda/types.ts`), so the download always matches the preview. Values that haven't been filled in yet show as highlighted placeholders, such as **[Fill in state]**. References to Cover Page terms in the Standard Terms (e.g. "the Purpose") are kept as written, as in the original agreement, and are highlighted in the preview.

The NDA itself is generated in the browser: what the user types into the NDA form is never sent to the server. Only the sign-in name and email go to the backend.

## License

The Mutual NDA text is © Common Paper, Inc., licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Generated documents keep Common Paper's attribution.
