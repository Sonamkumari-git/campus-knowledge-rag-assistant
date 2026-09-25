# Campus Knowledge AI

Campus Knowledge AI is a production-style campus knowledge assistant that turns indexed university documents into grounded, source-aware answers. Students can ask questions about academics, exams, housing, scholarships, admissions, and library services. Administrators can inspect the document library and monitor knowledge-base health.

> **Grounding rule:** Campus AI should only answer campus-specific facts when the knowledge base contains relevant evidence. When retrieval is not reliable, it says that the information was not found instead of inventing a policy, fee, date, or percentage.

## What is included

The current application includes a polished responsive landing page, chat workspace, source explorer, document library, administrator dashboard, seeded campus corpus, similarity-style retrieval, source cards, feedback controls, bounded chat history in the client, loading/error/no-result states, server-side LLM integration with a grounded fallback, and automated retrieval/auth tests.

The seeded corpus is deliberately labelled as demonstration data. Replace or extend it with institution-approved documents before using this as an official campus service.

## Important implementation note

The supplied design brief requested Python/FastAPI/Vanilla JavaScript. This deployment uses a supported full-stack implementation: React 19 + TypeScript on the client, Express/tRPC on the server, MongoDB for user persistence, and the platform's server-side LLM helper. The product boundaries remain the same: frontend secrets are not exposed, retrieval and generation stay server-side, the vector/search layer is isolated behind service functions, and the UI is responsive and accessible.

If a standalone Python service is required for a self-hosted deployment, the `server/campusData.ts` interfaces map directly to the planned Python modules: loader, cleaner, chunker, embeddings, retriever, generator, and pipeline. The architecture plan is available at `/home/ubuntu/campus-rag-phase1-architecture.md` in the working environment.

## Product tour

### Ask AI

Open `/chat` to ask a campus question. Suggested prompts demonstrate the main supported topics. Each grounded response can show document names, pages, sections, excerpts, a relevance indicator, copy, regeneration, and helpful/not-helpful feedback controls.

### Explore

Open `/explorer` to search the indexed corpus without generation. This is useful when a student wants to see the exact policy passage behind an answer or when an administrator wants to inspect retrieval coverage.

### Documents

Open `/documents` to browse the current source library, search by document title/category, and try the upload workflow. The UI accepts PDF, DOCX, and TXT selections and displays indexing-oriented metadata. The current preview uses a seeded corpus so it works without external file setup; the production storage hook is described below.

### Admin

Open `/admin` to see indexed document count, chunk count, questions answered, helpfulness, recent questions, vector index status, answer engine status, and a retrieval insight.

## Architecture

```text
React client
  ├── Home / Chat / Explorer / Documents / Admin
  └── typed tRPC client
          │
          ▼
Express + tRPC server
  ├── auth / session helpers from the scaffold
  ├── workspace statistics
  ├── source list and search
  ├── grounded chat procedure
  └── feedback procedure
          │
          ├── seeded campus corpus + retrieval service
          ├── server-side LLM helper (optional fallback)
          └── application database/auth scaffold
```

The retrieval service is intentionally kept in `server/campusData.ts`. It contains source metadata, a small transparent corpus, query normalization, category filtering, threshold-style matching, and the safe fallback response. A production vector layer can replace `retrieveChunks` without changing the UI contract.

## Technology stack

| Layer | Current implementation |
|---|---|
| Client | React 19, TypeScript, Vite, Tailwind-compatible scaffold, custom CSS design system |
| Navigation | Wouter |
| UI | Lucide icons, Streamdown answer rendering, responsive CSS |
| Server | Express, tRPC 11, Zod validation |
| Auth | Manus OAuth/session scaffold with role support from the platform template |
| Data platform | MongoDB Node.js driver; users are stored in the `users` collection |
| Generation | Server-side `invokeLLM` using a configurable platform model, with a grounded deterministic fallback |
| Retrieval | Transparent seeded corpus now; FAISS/Hugging Face adapter can replace it for standalone deployment |
| Validation | Vitest, TypeScript compiler, Vite/esbuild production build |

## Project structure

```text
campus-knowledge-ai/
├── client/
│   ├── index.html
│   └── src/
│       ├── App.tsx
│       ├── index.css
│       ├── components/
│       │   └── AppShell.tsx
│       └── pages/
│           ├── Home.tsx
│           ├── ChatPage.tsx
│           ├── ExplorerPage.tsx
│           ├── DocumentsPage.tsx
│           └── AdminPage.tsx
├── server/
│   ├── campusData.ts
│   ├── routers.ts
│   ├── rag.test.ts
│   ├── db.ts
│   └── _core/
├── shared/
├── README.md
└── package.json
```

## Run locally

The project is already scaffolded for the managed development server. From the project folder:

```bash
cd /home/ubuntu/campus-knowledge-ai
pnpm install
pnpm dev
```

The preview URL is supplied by the WebDev project environment. For a regular local browser, open the URL printed by the development server.

### Windows learner setup

In PowerShell:

```powershell
cd campus-knowledge-ai
pnpm install
pnpm dev
```

If pnpm is not installed, install Node.js first and then run:

```powershell
npm install --global pnpm@10.4.1
```

## Environment configuration

Set server-side credentials for MongoDB, authentication, storage, and the built-in LLM in the deployment environment. Do not commit `.env` files or put secrets in the client.

The current chat procedure uses `CAMPUS_ENABLE_LLM` as an optional switch:

```text
CAMPUS_ENABLE_LLM=true   # default behavior: try the server-side LLM
CAMPUS_ENABLE_LLM=false  # use deterministic grounded fallback only
```

When the LLM helper fails or returns empty content, the server automatically uses the grounded fallback built from retrieved source text. This keeps the preview usable and avoids confident unsupported answers.

## Login, account creation, and logout

Authentication uses the scaffold's secure Manus OAuth flow rather than a home-grown password form. This means the application never stores a plaintext password and never exposes an OAuth secret in the browser.

The header's **Sign in** and **Create account** actions both start the official account portal through the nonce-protected `startLogin()` helper. New users can choose the portal's registration option, complete account creation there, and return to the application through the verified callback. Existing users can sign in with the same flow.

After login, the header displays the current account name. Selecting that account control calls the server-side `auth.logout` mutation, clears the session cookie, clears the preview token, invalidates the cached user query, and returns the UI to the signed-out state. The Documents and Admin routes also have a client-side session gate so a signed-out user receives a clear sign-in prompt instead of a broken page.

For production, keep the provider's allowed redirect origin aligned with the deployed site and require HTTPS. Browsers that block secure cookies or third-party tracking protections may prevent OAuth sessions from completing.

## How the current RAG loop works

1. The user submits a question to the typed `chat.ask` procedure.
2. The server normalizes query terms and removes generic stop words.
3. The retrieval service scores source passages using term coverage and a phrase bonus.
4. Results below the configured threshold are discarded.
5. The server builds a bounded context string containing document name, page, section, and source text.
6. The server asks the LLM to answer only from that context when LLM use is enabled.
7. Empty or failed generation falls back to a deterministic answer using retrieved content.
8. The response returns answer text, grounded status, latency, and source metadata.
9. The UI renders answer text and source cards separately.

This is a transparent development implementation, not a claim that the demo corpus is FAISS-indexed. For a larger corpus, replace the retrieval implementation with:

- PDF/DOCX/TXT loaders that retain page boundaries.
- Recursive heading-aware chunking.
- A cached Hugging Face sentence-transformer embedding model.
- A persisted FAISS index and row-to-metadata manifest.
- Top-k retrieval, cosine similarity thresholding, deduplication, and metadata filters.
- A rebuild operation for document deletion and version updates.

## How to add real documents

For a production implementation, upload the original file to server-side storage, create a document metadata row, extract the text, chunk it, generate embeddings, and persist the FAISS index plus a metadata manifest. Do not store large file bytes in normal database rows and do not expose provider keys to the browser.

The current Documents page demonstrates the user flow and validation affordance. The next storage-backed change should connect its file input to a protected admin procedure using the platform's `storagePut` helper, then create an indexing job or request-bounded pipeline depending on document size.

## API procedures

The application exposes these typed tRPC groups:

| Procedure | Purpose |
|---|---|
| `auth.me` | Read the current session user. |
| `auth.logout` | Clear the scaffold session cookie. |
| `workspace.stats` | Return document, chunk, usage, and health metrics. |
| `workspace.activity` | Return recent question activity. |
| `documents.categories` | Return category filter options. |
| `documents.list` | Return searchable source metadata. |
| `documents.search` | Return thresholded source matches. |
| `chat.ask` | Retrieve evidence and produce a grounded answer. |
| `feedback.submit` | Record a helpful/not-helpful interaction. |

## Testing and validation

Run the required checks:

```bash
pnpm test
pnpm check
pnpm build
```

The retrieval tests cover attendance retrieval, safe no-result behavior, and category filtering. The scaffold auth test covers session cookie clearing. The latest validation result is:

- 2 test files passed.
- 4 tests passed.
- TypeScript check passed.
- Production client/server build passed.

The build emits a chunk-size warning from the scaffold's Streamdown/diagram language bundles. It does not block the build. A future performance pass can lazy-load those features and split the client bundle.

## Security notes

The server keeps LLM credentials out of the client. Input procedures use Zod validation. The answer prompt prohibits invented campus facts. The UI distinguishes source text from generated explanation. The auth scaffold supplies protected session infrastructure and role support. Before production launch, add protected admin procedures to document mutation endpoints, rate-limit login and chat, restrict CORS origins, scan uploads by MIME and size, audit indexing events, and verify all document versions.

## Evaluation plan

Create a held-out evaluation set with:

```json
{
  "question": "What attendance is required for exams?",
  "expected_context": "Academic Rules & Regulations.pdf page 12",
  "expected_answer": "At least 75% attendance is required in each registered course."
}
```

Measure retrieval hit rate, context relevance, answer relevance, groundedness, citation validity, no-result precision, latency, helpfulness, and observed hallucination cases. Do not label a model as fine-tuned unless a reproducible training run writes model artifacts and an evaluation report.

## Deployment notes

The project can deploy to Render as a Node Web Service. Use `pnpm install --frozen-lockfile && pnpm build` as the build command and `pnpm start` as the start command; do not run `corepack enable` because Render's filesystem is read-only. Set `MONGODB_URI`, `MONGODB_DB_NAME`, `JWT_SECRET`, the OAuth variables, and the built-in API variables in Render's Environment settings. The runtime is a single Node process with request-bounded work, which matches the current demo retrieval and server-side generation flow. Large document indexing should move to a durable background-capable worker or a bounded upload pipeline before high-volume deployment.

For a standalone self-hosted version, use the architecture document and implement the Python modules described there with FastAPI, Pydantic, Hugging Face embeddings, FAISS, an application database, and a separately served static frontend. Keep the same response contract so the current UI can be adapted without changing its user experience.

## Future improvements

The next high-value improvements are persistent document uploads and indexing, a real FAISS/Hugging Face adapter, database-backed conversations and feedback, protected admin mutations, explicit document version precedence, evaluation reports, streaming responses, and code splitting for the markdown renderer.
