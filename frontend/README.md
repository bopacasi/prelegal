# Prelegal frontend

The Next.js app for Prelegal. It has a placeholder sign-in page and, behind it, the Mutual NDA creator ([KAN-5](https://bogdanlangendorf.atlassian.net/browse/KAN-5), [KAN-7](https://bogdanlangendorf.atlassian.net/browse/KAN-7)). In the NDA creator the user chats with an AI assistant, which asks about the agreement and fills in the NDA from the answers. The complete agreement updates live next to the chat, and the user downloads it as an OpenDocument Text (`.odt`) file. The file opens in LibreOffice, Microsoft Word, Google Docs and Apple Pages.

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
next.config.ts          Rewrites /api/* to the backend at BACKEND_URL (the rewrite is fixed at build time)
lib/config.ts           BACKEND_URL, the session cookie name and the signed-in home path
lib/api/client.ts       Browser calls to the backend: login, logout
lib/api/server.ts       getCurrentUser() for server components (reads BACKEND_URL at runtime)
components/shell        App header with "Signed in as …" and Sign out; the "unavailable" page
components/login        The sign-in form
components/Nda*         NDA creator: values, assistant chat, preview
lib/chat/               Assistant chat: API call, useNdaChat hook, merging the assistant's updates
lib/nda/                NDA logic: template loading and parsing, document model, .odt export
```

### Sessions

1. Signing in posts the name and email to `/api/auth/login`. The backend creates a session and sets the `prelegal_session` cookie (`HttpOnly`).
2. `proxy.ts` sends any request without that cookie to `/login`. It's only a quick check.
3. The `(app)` layout then asks the backend who the user is (`/api/users/me`). If the session no longer exists, for example because the backend restarted with an empty database, it redirects to `/login`. If the backend can't be reached, it shows a "temporarily unavailable" page.

## How the NDA creator works

The agreement is a filled-in **Cover Page** followed by Common Paper's **Mutual NDA Standard Terms**, which come from the template dataset in [`../data/templates`](../data/templates) (or `TEMPLATES_DIR`).

```
components/NdaCreator   Client component: NDA values, live preview, download
components/NdaChat      The assistant chat (useNdaChat in lib/chat/)
components/NdaPreview   Renders the document as HTML
lib/nda/load.ts         Finds the template through data/templates/manifest.json and reads it
lib/nda/terms.ts        Parses the template Markdown into clauses and inline runs
lib/nda/document.ts     Builds the document model from the NDA values
lib/nda/odt.ts          Writes the document model as an .odt file (with JSZip)
```

The HTML preview and the `.odt` export both render the same document model (`lib/nda/types.ts`), so the download always matches the preview. Values that haven't been filled in yet show as highlighted placeholders, such as **[Fill in state]**. References to Cover Page terms in the Standard Terms (e.g. "the Purpose") are kept as written, as in the original agreement, and are highlighted in the preview.

### The assistant

Each chat turn posts the conversation so far and the current NDA values to `/api/chat/nda`. The backend asks the LLM and returns the assistant's reply plus the fields to update (`updates`). `lib/chat/merge.ts` applies those to the values, and the preview follows. The assistant speaks first. A failed turn leaves the document unchanged and can be retried. The chat history lives only in the page, so it's gone on reload.

The `.odt` file is generated in the browser. The chat messages and NDA values are sent to the backend, which passes them to the LLM provider (OpenRouter, served by Cerebras).

## License

The Mutual NDA text is © Common Paper, Inc., licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Generated documents keep Common Paper's attribution.
