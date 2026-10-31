# DevFlow AI

**A project-aware workspace for developers** — plan work, track bugs, review code, generate API docs, and talk to an assistant that actually knows *your* project.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

Final year project · MERN + AI · [Repository](https://github.com/py43-cmd/devflow_ai)

---

## Why it exists

Most AI coding tools are generic. DevFlow AI is scoped to **one project at a time**: tasks, bugs, uploaded documents, and conversation history stay isolated. The assistant cites what it used, and user-supplied code and text are treated as untrusted data — never as instructions.

It is one place to:

1. Create a project and keep its tasks and bugs next to it
2. Ask an assistant grounded in that project and its documents
3. Run structured AI jobs — bug analysis, code review, API docs, task breakdowns — with JSON-validated output

---

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Project layout](#project-layout)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [API surface](#api-surface)
- [How the AI layer stays reliable](#how-the-ai-layer-stays-reliable)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Known limitations](#known-limitations)
- [Documentation](#documentation)
- [License](#license)

---

## Features

| Area | What you get |
| --- | --- |
| **Projects** | Create, update, and browse projects from a dark dashboard workspace |
| **Tasks** | Kanban-style board with filters, detail pages, and full CRUD |
| **Bugs** | Tracker with status, filters, and **AI analysis** (severity, root cause, suggested fix) |
| **Code review** | Paste source, get a score plus categorized findings — input capped at 20,000 characters |
| **Documentation** | Describe an endpoint; get structured API docs you can copy |
| **Task generator** | Turn a feature description into a ready-to-review task list |
| **AI assistant** | Multi-turn chat per project, with citations (project / task / bug / document) |
| **Knowledge base** | Upload documents (PDF, Markdown, source, JSON; up to 10 MB). Chunks are embedded and retrieved with RAG |
| **Auth** | Register / login with JWT, bcrypt password hashing, protected routes on both client and API |

All AI calls go through a single **OpenAI-compatible** provider layer, so the backend works with OpenAI, Google Gemini, Groq, OpenRouter, or a local model by changing environment variables only. Every response is schema-validated before it reaches the UI.

---

## Architecture

```
  React 19 + Vite  ──────────────►  Express 5 API  ──────┬──────►  MongoDB Atlas
  localhost:5173     Axios + JWT    localhost:5000       │         users, projects, tasks,
  Tailwind CSS 4                                        │         bugs, conversations,
  pages, components,                                    │         documents, chunks
  context, services                                     │
                                                        └──────►  AI provider
                                                                  (OpenAI-compatible)
                                                                  /chat/completions
                                                                  /embeddings
```

**RAG path:** upload → extract text → chunk with overlap → embed → store → retrieve by cosine similarity on each assistant message → build a grounded prompt → answer with citations.

**Request path:** route → middleware (auth, validation) → controller → service → Mongoose model. Controllers never call the AI provider directly; they go through `services/ai/`.

---

## Tech stack

**Client**

- React 19, React Router 7, Axios
- Vite 8, Tailwind CSS 4
- Context-based auth with protected routes

**Server**

- Node.js, Express 5, Mongoose 9 (MongoDB Atlas)
- JWT + bcryptjs, Helmet, CORS allowlist
- Multer (uploads), pdf-parse (PDF text extraction)
- Custom RAG pipeline: chunking, embeddings, cosine-similarity retrieval
- Structured AI output enforced with per-feature JSON schemas and validators
- `node:test` for automated tests

---

## Project layout

```
devflow-ai/
├── client/                     # Vite React app
│   ├── .env.example            # VITE_API_URL
│   └── src/
│       ├── pages/              # Auth, dashboard, AI tools
│       ├── components/         # Layout, tasks, bugs, review, knowledge
│       ├── services/           # Axios API clients
│       ├── context/            # Auth state
│       └── routes/             # ProtectedRoute
└── server/
    ├── src/
    │   ├── app.js              # Middleware + route mounting
    │   ├── server.js           # Mongo connection + listen
    │   ├── routes/             # auth, projects, tasks, bugs, ai, conversations, documents
    │   ├── controllers/        # Request handling + error mapping
    │   ├── models/             # 12 Mongoose models
    │   ├── middleware/         # Auth, validation
    │   └── services/
    │       ├── ai/             # Provider, prompts, validators, feature services
    │       ├── rag/            # Extract, chunk, embed, retrieve
    │       └── codebase/       # Repository indexing (not wired up yet)
    ├── scripts/checkAi.js      # Safe provider health check
    └── test/                   # node:test suites
```

---

## Getting started

### Requirements

- **Node.js 18+**
- **MongoDB** — local instance or a free MongoDB Atlas cluster
- **An AI API key** (optional but recommended) — any OpenAI-compatible host

### 1. Clone and install

```bash
git clone https://github.com/py43-cmd/devflow_ai.git
cd devflow_ai

cd server && npm install
cd ../client && npm install
```

### 2. Configure the server

Copy the example file and fill it in:

```bash
cd server
cp .env.example .env        # Windows: copy .env.example .env
```

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/devflow
JWT_SECRET=replace-with-a-long-random-string

AI_PROVIDER=openai
AI_API_KEY=
AI_MODEL=gpt-4o-mini
AI_BASE_URL=https://api.openai.com/v1
AI_TIMEOUT_MS=30000
AI_EMBEDDING_MODEL=text-embedding-3-small
```

> **Never commit `.env`.** It is git-ignored, and the key never reaches the client.

The server runs without a key — only the AI routes are affected (`AI_NOT_CONFIGURED`). Embeddings fall back to a deterministic local vector, which is what the offline tests use.

### 3. Run both apps

**Terminal 1 — API**

```bash
cd server
npm run dev
```

**Terminal 2 — UI**

```bash
cd client
npm run dev
```

Open **http://localhost:5173**.
Health check: **http://localhost:5000/api/health**

CORS allows `http://localhost:5173` and `http://127.0.0.1:5173` only.

### 4. First use

1. Register an account
2. Create a project
3. Add tasks or bugs, or upload a document on the project page
4. Open **AI Assistant** and ask something about that project
5. Wait for an uploaded document to show **indexed** before asking questions about it

### 5. Verify the AI provider (optional)

```bash
cd server
npm run ai:check
```

Prints `PASS`/`FAIL` for a chat request and an embedding request. It **never** prints the API key, and it is the right way to test the live provider — the unit tests stay offline.

---

## Configuration

### Server (`server/.env`)

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `PORT` | No | `5000` | API port (Render sets this automatically) |
| `MONGO_URI` | **Yes** | — | Local URI or Atlas connection string |
| `JWT_SECRET` | **Yes** | — | Long random string; changing it invalidates all tokens |
| `CLIENT_ORIGINS` | For deploys | — | Comma-separated extra browser origins, e.g. `https://devflow-ai.vercel.app`. Wildcards like `https://*.vercel.app` cover preview deployments. Localhost is always allowed. |
| `AI_PROVIDER` | For AI | — | Provider adapter; empty means AI routes return `AI_NOT_CONFIGURED` |
| `AI_API_KEY` | For AI | — | Backend only; never exposed to the client |
| `AI_MODEL` | For AI | — | Chat model id |
| `AI_BASE_URL` | No | `https://api.openai.com/v1` | Any OpenAI-compatible endpoint |
| `AI_TIMEOUT_MS` | No | `30000` | Raise it for slow reasoning models / long reviews |
| `AI_EMBEDDING_MODEL` | No | `text-embedding-3-small` | Must support `/embeddings` for real RAG |

### Client (`client/.env`)

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `VITE_API_URL` | No | `http://localhost:5000/api` | API base URL used by Axios |

### Example: Google Gemini (free tier)

```env
AI_PROVIDER=openai
AI_API_KEY=your-gemini-key
AI_MODEL=gemini-3.5-flash
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_TIMEOUT_MS=60000
AI_EMBEDDING_MODEL=gemini-embedding-001
```

Get a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Model IDs change over time — if a model returns `404`, use the exact name listed in AI Studio.

> **Changing the embedding model invalidates existing vectors.** Re-upload documents after switching, or retrieval will silently return nothing.

---

## Deployment

The client and API deploy separately: **React on Vercel**, **Express on Render**, **MongoDB Atlas** for data.

### Order matters

Deploy the API first (it gives you the URL the client needs), then the client, then add the client's URL back to the API.

### 1. MongoDB Atlas

1. Create a free M0 cluster and a database user.
2. **Network Access → Add IP Address → `0.0.0.0/0`.** Render's outbound IPs are not fixed, so allow-listing a single IP will fail intermittently.
3. Copy the connection string into `MONGO_URI`, including the database name: `mongodb+srv://user:pass@cluster.mongodb.net/devflow`.

### 2. API on Render

Either import the blueprint (`render.yaml` in the repo root) via **New → Blueprint**, or create a **Web Service** manually:

| Setting | Value |
| --- | --- |
| Root Directory | `server` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

Environment variables to set in the Render dashboard:

```env
MONGO_URI=mongodb+srv://…
JWT_SECRET=<long random string>
CLIENT_ORIGINS=https://your-app.vercel.app
AI_PROVIDER=openai
AI_API_KEY=<your key>
AI_MODEL=gemini-3.5-flash
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_EMBEDDING_MODEL=gemini-embedding-001
AI_TIMEOUT_MS=60000
```

Do **not** set `PORT` — Render injects it.

Verify: `https://<your-service>.onrender.com/api/health` should return `{"success":true,...}`.

### 3. Client on Vercel

| Setting | Value |
| --- | --- |
| Root Directory | `client` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Environment Variable | `VITE_API_URL=https://<your-service>.onrender.com/api` |

`client/vercel.json` rewrites all paths to `index.html` so React Router deep links work on refresh.

### 4. Close the CORS loop

After Vercel gives you a domain, set it on Render and redeploy the API:

```env
CLIENT_ORIGINS=https://your-app.vercel.app,https://*.vercel.app
```

Without this, the browser blocks the request with a CORS error even though the API itself is healthy.

### Free-tier realities

- **Render free instances sleep** after ~15 minutes of inactivity; the first request afterwards can take 30–60 seconds. Open the app once before a demo.
- **Gemini free tier is rate-limited**; bursts of test calls return `502` until the limit resets.
- **Vercel preview deployments** get a new URL per commit — that is what the `*.vercel.app` wildcard is for.

---

## API surface

All routes except `register`, `login`, and `/api/health` require `Authorization: Bearer <token>`.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Log in |
| `GET` | `/api/auth/me` | Current user |
| `GET` `POST` `PUT` `DELETE` | `/api/projects` … | Project CRUD |
| `GET` `POST` | `/api/projects/:projectId/tasks` | Tasks in a project |
| `GET` `PUT` `DELETE` | `/api/tasks/:id` | Single task |
| `GET` `POST` | `/api/projects/:projectId/bugs` | Bugs in a project |
| `GET` `PUT` `DELETE` | `/api/bugs/:id` | Single bug |
| `POST` | `/api/bugs/:id/analyze` | AI bug analysis |
| `POST` | `/api/code-review` | AI code review |
| `POST` | `/api/ai/documentation` | AI API documentation |
| `POST` | `/api/ai/tasks/generate` | AI task breakdown |
| `POST` | `/api/projects/:projectId/ai/assistant` | One-shot project Q&A |
| `GET` `POST` | `/api/conversations` | Chat threads |
| `GET` `POST` | `/api/conversations/:id/messages` | Messages in a thread |
| `GET` `POST` `DELETE` | `/api/projects/:projectId/documents` | Knowledge files |
| `POST` | `/api/projects/:projectId/knowledge/search` | Semantic search |

JSON bodies are capped at **256 KB**. Oversized or malformed JSON returns a consistent error payload (`PAYLOAD_TOO_LARGE`, `INVALID_JSON`).

---

## How the AI layer stays reliable

Most "AI features" break silently. These are the deliberate countermeasures in this project:

| Problem | Approach |
| --- | --- |
| Model returns prose instead of JSON | Request `response_format: json_object` **and** validate against a per-feature schema; reject anything that does not match |
| Model returns the wrong shape | A dedicated validator per feature (`validators/`) normalises and rejects bad output before it reaches the UI |
| Provider is down or rate-limited | Typed errors (`AI_NOT_CONFIGURED`, `AI_TIMEOUT`, `AI_PROVIDER_ERROR`, `AI_INVALID_RESPONSE`) mapped to correct HTTP statuses, with user-safe messages |
| Prompt injection | Retrieved documents, code, and issue text are fenced as untrusted evidence; the system prompt forbids role changes and prompt disclosure |
| Cross-project data leaks | Every query is scoped to the authenticated user's project; retrieval filters by `projectId` |
| Unbounded prompts | Context is capped (e.g. ~50 tasks and ~50 bugs), and code review input is limited to 20,000 characters |
| Oversized uploads / payloads | 10 MB upload limit with type checks; 256 KB JSON body limit |
| Secrets leaking to the browser | The API key lives only in `server/.env`; the client never receives it |

---

## Testing

```bash
cd server
npm test
```

- **30 tests**, `node:test`, no external test runner
- Covers the RAG pipeline (extraction, chunking, embeddings, cosine similarity), strict project-scoped retrieval isolation, and the conversation/assistant flow
- **Fully offline and deterministic** — the suite forces the local embedding fallback instead of calling a real provider
- Live provider integration is verified separately with `npm run ai:check`

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `503` with `AI_NOT_CONFIGURED` | The running server has no `AI_API_KEY` | Add the key to `server/.env`, then **restart** the server (env is read at boot) |
| `502` with `AI_PROVIDER_ERROR` | The provider rejected or rate-limited the request | Wait 15–30 s and retry once; free tiers limit bursts |
| `504` with `AI_TIMEOUT` | The model is slower than `AI_TIMEOUT_MS` | Raise `AI_TIMEOUT_MS` (long code reviews need up to 60 s) |
| `404` on an AI call | The model id is not available to your key | Use the exact model name from your provider's console |
| Assistant answers but cites nothing | Documents were indexed with a different embedding model | Re-upload the documents so vectors match |
| `Cannot find module 'x'` | `node_modules` missing or partially installed | `npm install` in `server` (and `client`) |
| `EADDRINUSE` on port 5000 | An old server process is still running | Stop it (`Get-Process node \| Stop-Process -Force` on Windows) and start again |

---

## Known limitations

Honest scope notes — these are deliberate and documented, not hidden:

- **Repository/codebase indexing is unfinished.** Code in `server/src/services/codebase/` (zip ingest, symbol graph, request-flow tracing) is not mounted on any route and has no UI.
- **Free-tier AI quotas are real.** Provider rate limits can surface as `502`; the app handles them cleanly but cannot remove them.
- **Retrieval is in-application.** Chunks are loaded per project and scored in Node. Fine for small knowledge bases; a production system would use Atlas Vector Search or a dedicated vector database.
- **Not deployed.** The project runs locally; there is no hosted demo.
- **No CI yet.** Tests are run manually via `npm test`.
- **AI output is advisory.** Reviews and analyses are suggestions, not authoritative results.

Potential next steps: finish the codebase module, add a GitHub Actions workflow, add per-user AI rate limiting, and deploy the API + client.

---

## Documentation

| Document | Contents |
| --- | --- |
| [`docs/PROJECT_REPORT.md`](docs/PROJECT_REPORT.md) | Full academic report: requirements, architecture, data model, RAG design, testing, limitations |
| [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) | Timed 5–7 minute demo walkthrough with failure fallbacks |
| [`docs/VIVA_QA.md`](docs/VIVA_QA.md) | Examiner questions with answers and key numbers |
| [`docs/DevFlow_AI_Interview_Prep.pdf`](docs/DevFlow_AI_Interview_Prep.pdf) | Printable 24-page interview guide: briefs, stack rationale, 40 Q&A, 12 scenarios, cheat sheet |
| [`docs/SUBMISSION_CHECKLIST.md`](docs/SUBMISSION_CHECKLIST.md) | Submission-day plan, safety pass, and packaging |

---

## Scripts

| Location | Command | Purpose |
| --- | --- | --- |
| `server` | `npm run dev` | API with nodemon |
| `server` | `npm start` | Production-style `node src/server.js` |
| `server` | `npm test` | Run the offline test suite |
| `server` | `npm run ai:check` | Verify the live AI provider (chat + embeddings) |
| `client` | `npm run dev` | Vite dev server |
| `client` | `npm run build` | Production bundle |
| `client` | `npm run preview` | Preview the production build |

---

## License

ISC (see `server/package.json`). Use and extend for learning and evaluation.

This project was built as a **final year academic project**. It is not a hosted SaaS.
