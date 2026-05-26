# CareerPilot

Agentic career co-pilot for hackathons — RAG over your CV, AI assistant, job search with fit scores, and progress tracking.

## Features

| Pillar | Route | Description |
|--------|-------|-------------|
| **CV Upload & RAG** | `/upload` | PDF/DOCX → section chunks → Ollama embeddings → Supabase pgvector |
| **AI Assistant** | `/assistant` | Chat grounded in your CV via semantic search |
| **Job Hunter** | `/jobs` | Natural language search (Adzuna) + AI fit scores |
| **Progress Tracker** | `/tracker` | Kanban, to-dos, goals, calendar |

## Prerequisites

1. **Ollama** running locally:
   ```bash
   ollama pull qwen3.5:4b
   ollama pull nomic-embed-text
   ```

2. **Supabase** project — run `supabase/schema.sql` in the SQL Editor.

3. **Adzuna API** keys from [developer.adzuna.com](https://developer.adzuna.com/).

## Setup

```bash
cp .env.example .env.local
# Fill in Supabase + Adzuna keys

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

See `.env.example` for all variables. Key ones:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `OLLAMA_BASE_URL` (default `http://localhost:11434`)
- `OLLAMA_CHAT_MODEL` (default `qwen3.5:4b`)
- `OLLAMA_EMBED_MODEL` (default `nomic-embed-text`, 768 dimensions)
- `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`

## Architecture

```
CV (PDF/DOCX) → parse → chunk by section → embed (Ollama) → cv_chunks (pgvector)
                                                              ↓
User question → embed → match_cv_chunks RPC → context → Ollama chat
Job query     → Adzuna API → score vs CV context → fit-scored cards
Tracker       → tracker_items table (kanban / todo / goal / event)
```

## Tech stack

- Next.js App Router, Tailwind, shadcn/ui
- Supabase (Postgres + pgvector)
- Ollama (local LLM + embeddings)
- Adzuna (job listings)
