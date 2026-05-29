-- Run in Supabase SQL Editor
create extension if not exists vector;

-- CV chunks for RAG (768-dim = nomic-embed-text via Ollama)
create table if not exists cv_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  content text not null,
  section text not null default 'general',
  embedding vector(768),
  created_at timestamptz default now()
);

create index if not exists cv_chunks_user_id_idx on cv_chunks (user_id);
create index if not exists cv_chunks_embedding_idx on cv_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create or replace function match_cv_chunks(
  query_embedding vector(768),
  match_user_id text,
  match_count int default 5
)
returns table (
  id uuid,
  content text,
  section text,
  similarity float
)
language sql stable
as $$
  select
    cv_chunks.id,
    cv_chunks.content,
    cv_chunks.section,
    1 - (cv_chunks.embedding <=> query_embedding) as similarity
  from cv_chunks
  where cv_chunks.user_id = match_user_id
    and cv_chunks.embedding is not null
  order by cv_chunks.embedding <=> query_embedding
  limit match_count;
$$;

-- Chat history
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

create index if not exists chat_messages_user_id_idx on chat_messages (user_id, created_at);

-- Saved job searches
create table if not exists saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  external_id text,
  title text not null,
  company text,
  location text,
  description text,
  url text,
  salary_min numeric,
  salary_max numeric,
  fit_score int,
  fit_reason text,
  created_at timestamptz default now()
);

create unique index if not exists saved_jobs_user_external_idx on saved_jobs (user_id, external_id);
create index if not exists saved_jobs_user_id_idx on saved_jobs (user_id);

-- Progress tracker (kanban, todos, goals, calendar)
create table if not exists tracker_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  item_type text not null check (item_type in ('kanban', 'todo', 'goal', 'event')),
  title text not null,
  description text,
  status text default 'pending',
  column_key text,
  due_date date,
  start_at timestamptz,
  end_at timestamptz,
  progress int default 0 check (progress >= 0 and progress <= 100),
  position int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists tracker_items_user_type_idx on tracker_items (user_id, item_type);

-- Calendar + day to-dos
create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  text text not null,
  due_date date,
  done boolean default false,
  created_at timestamptz default now()
);

create index if not exists todos_user_id_idx on todos (user_id, due_date);

-- Weekly goals
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  text text not null,
  target int not null,
  created_at timestamptz default now()
);

create index if not exists goals_user_id_idx on goals (user_id, created_at);

-- Application tracker (Kanban)
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  job_title text not null,
  company text not null,
  status text not null check (status in ('Applied', 'Interviewing', 'Offer', 'Rejected')),
  applied_date date not null,
  notes text,
  job_url text,
  salary numeric,
  location text,
  created_at timestamptz default now()
);

create index if not exists applications_user_id_idx on applications (user_id, applied_date);
create index if not exists applications_user_status_idx on applications (user_id, status);
