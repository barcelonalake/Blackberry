-- AI Workspace OS v0.1 initial schema draft
create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  owner_id uuid references profiles(id),
  icon text,
  created_at timestamptz not null default now()
);

create table if not exists workspace_members (
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null check (role in ('owner','member','viewer')),
  primary key (workspace_id, user_id)
);

create table if not exists channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  description text,
  kind text not null default 'general',
  position int not null default 0
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  channel_id uuid references channels(id) on delete set null,
  title text not null,
  summary text,
  status text not null default 'active',
  kind text not null default 'chat',
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  role text not null,
  content text not null,
  content_json jsonb,
  status text not null default 'done',
  model text,
  parent_message_id uuid references messages(id),
  created_at timestamptz not null default now()
);

create table if not exists artifacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  title text not null,
  kind text not null,
  mime_type text,
  storage_path text,
  content text,
  version int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  scope text not null default 'workspace',
  kind text not null default 'preference',
  title text not null,
  content text not null,
  source_session_id uuid references sessions(id) on delete set null,
  confidence numeric default 1.0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  artifact_id uuid references artifacts(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'todo',
  priority text not null default 'medium',
  assignee_id uuid references profiles(id),
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  status text not null default 'queued',
  agent_name text not null,
  input jsonb,
  output jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
