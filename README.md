# DevFlow AI

**A project-aware workspace for developers** — plan work, track bugs, review code, generate docs, and talk to an assistant that actually knows *your* project.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

Final year project · MERN + AI · [Repository](https://github.com/py43-cmd/devflow_ai)

---

## Why it exists

Most AI coding tools are generic. DevFlow AI is scoped to a **single project at a time**: tasks, bugs, uploaded documents, and conversation history stay isolated. The assistant cites what it used. User-supplied code and text are treated as untrusted data, not as instructions.

It is one place to:

1. Create a project and keep tasks + bugs next to it
2. Ask an assistant grounded in that project (and its documents)
3. Run structured AI jobs — bug analysis, code review, API docs, task breakdowns — with JSON-validated output

---

## Features

| Area | What you get |
| --- | --- |
| **Projects** | Create, update, and browse projects from a dark dashboard workspace |
| **Tasks** | Kanban-style board with filters, detail pages, and CRUD |
| **Bugs** | Tracker with status, filters, and **AI analysis** (severity, root cause, suggested fix) |
| **Code review** | Paste source, get scored findings with categories — input capped at 20k characters |
| **Documentation** | Describe an endpoint; get structured API docs you can copy |
| **Task generator** | Turn a feature description into a ready-to-review task list |
| **AI assistant** | Multi-turn chat per project, with citations (project / task / bug / document) |
| **Knowledge** | Upload documents (PDF and similar, up to 10 MB). Chunks are embedded and retrieved with RAG |
| **Auth** | Register / login with JWT, bcrypt passwords, protected routes on client and API |

AI calls go through an **OpenAI-compatible** provider (OpenAI, Groq, OpenRouter, and others) by setting `AI_BASE_URL`. Responses are schema-validated. Context is limited (including ~50 tasks / 50 bugs) so prompts stay bounded.

---

## Architecture

```
┌─────────────────┐         JWT          ┌──────────────────────┐
│  React + Vite   │  ──────────────────► │  Express 5 API       │
│  Tailwind CSS 4 │   localhost:5173     │  localhost:5000      │
│                 │                      │                      │
│  Pages / UI     │                      │  MVC: routes →       │
│  Axios client   │                      │  controllers →       │
└─────────────────┘                      │  services / models   │
                                         └──────────┬───────────┘
                                                    │
                          ┌─────────────────────────┼─────────────────────────┐
                          ▼                         ▼                         ▼
                    MongoDB                    Chat + embeddings         Vector store
                    (users,                    (OpenAI-compatible        (document
                     projects,                  /chat/completions        chunks, cosine
                     tasks, bugs,               + /embeddings)           retrieval)
                     conversations)
```

**RAG path:** upload → extract text → chunk → embed → store → retrieve on each assistant message → prompt with retrieved excerpts → cite sources.

---

## Tech stack

**Client**

- React 19, React Router 7, Axios
- Vite 8, Tailwind CSS 4

**Server**

- Node.js, Express 5, Mongoose 9
- JWT + bcryptjs, Helmet, CORS allowlist
- Multer (uploads), pdf-parse (PDF text)
- Custom RAG pipeline (chunking, embeddings, in-app vector store)

---

## Project layout

```
devflow-ai/
├── client/                 # Vite React app
│   └── src/
│       ├── pages/          # Auth, dashboard, AI tools
│       ├── components/     # Layout, tasks, bugs, review, knowledge
│       ├── services/       # API clients
│       ├── context/        # Auth
│       └── routes/         # ProtectedRoute
└── server/
    ├── src/
    │   ├── app.js          # Middleware + route mount
    │   ├── routes/         # Auth, projects, tasks, bugs, AI, chats, docs
    │   ├── controllers/
    │   ├── models/
    │   ├── middleware/
    │   └── services/
    │       ├── ai/         # Provider, prompts, validators, assistants
    │       ├── rag/        # Ingest, chunk, embed, retrieve
    │       └── codebase/   # Indexer / graph (in progress)
    ├── test/               # node --test (RAG)
    └── .env.example
```

---

## Getting started

### Requirements

- Node.js 18+
- MongoDB (local or Atlas)
- An API key for an OpenAI-compatible chat (and embeddings, if you want real RAG vectors)

### 1. Clone and install

```bash
git clone https://github.com/py43-cmd/devflow_ai.git
cd devflow_ai

cd server && npm install
cd ../client && npm install
```

### 2. Configure the API

Copy `server/.env.example` to `server/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/devflow
JWT_SECRET=generate-a-long-random-string

AI_PROVIDER=openai
AI_API_KEY=your-key
AI_MODEL=gpt-4o-mini
AI_BASE_URL=https://api.openai.com/v1
AI_TIMEOUT_MS=30000
AI_EMBEDDING_MODEL=text-embedding-3-small
```

Use any compatible host by changing `AI_BASE_URL` and `AI_MODEL`. Without a key, the server still runs; AI routes return `AI_NOT_CONFIGURED`. Embeddings fall back to a deterministic mock vector (useful for tests).

Never commit `.env`.

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

Open [http://localhost:5173](http://localhost:5173). The client talks to `http://localhost:5000/api`. CORS allows `localhost` and `127.0.0.1` on port 5173.

Health check: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### 4. First use

1. Register an account  
2. Create a project  
3. Add tasks or bugs, or upload a document on the project page  
4. Open **AI Assistant** and ask something about that project  

---

## Scripts

| Location | Command | Purpose |
| --- | --- | --- |
| `server` | `npm run dev` | Nodemon API |
| `server` | `npm start` | Production-style `node src/server.js` |
| `server` | `npm test` | `node --test` (RAG pipeline) |
| `client` | `npm run dev` | Vite dev server |
| `client` | `npm run build` | Production bundle |
| `client` | `npm run preview` | Preview the build |

---

## API surface

All routes except auth register/login and `/api/health` require `Authorization: Bearer <token>`.

| Method | Path | Role |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/auth/me` | Current user |
| `GET`/`POST`/`PUT`/`DELETE` | `/api/projects` … | Projects |
| `GET`/`POST` | `/api/projects/:projectId/tasks` | Tasks on a project |
| `GET`/`PUT`/`DELETE` | `/api/tasks/:id` | Single task |
| `GET`/`POST` | `/api/projects/:projectId/bugs` | Bugs on a project |
| `GET`/`PUT`/`DELETE` | `/api/bugs/:id` | Single bug |
| `POST` | `/api/bugs/:id/analyze` | AI bug analysis |
| `POST` | `/api/code-review` | AI code review |
| `POST` | `/api/ai/documentation` | AI API docs |
| `POST` | `/api/ai/tasks/generate` | AI task list |
| `POST` | `/api/projects/:projectId/ai/assistant` | One-shot project Q&A |
| `GET`/`POST` | `/api/conversations` | Chat threads |
| `GET`/`POST` | `/api/conversations/:id/messages` | Messages |
| `GET`/`POST`/`DELETE` | `/api/projects/:projectId/documents` | Knowledge files |
| `POST` | `/api/projects/:projectId/knowledge/search` | Semantic search |

JSON bodies are capped at **256 KB**. Oversized or invalid JSON returns a consistent error payload.

---

## Design choices that matter

- **Prompt injection:** system rules treat titles, descriptions, errors, and code as evidence, not commands. The model is instructed not to reveal system prompts or change role.
- **Per-project isolation:** assistant context and document retrieval are scoped to the selected project.
- **Structured output:** AI modules request JSON matching a schema, then validate before the client sees it.
- **Security headers:** Helmet on the API; CORS is an allowlist, not `*`.
- **Passwords:** hashed with bcrypt; JWT secret stays on the server.

---

## Tests

```bash
cd server
npm test
```

RAG tests cover chunking, embeddings (including the offline mock), and retrieval without a live model.

---

## Notes

Codebase zip ingest, symbol graph, and request-flow tracing live under `server/src/services/codebase/` and are still being wired into the HTTP layer.

This project is built as a **final year academic project**. It is not a hosted SaaS.

---

## License

ISC (see `server/package.json`). Use and extend for learning and evaluation.
