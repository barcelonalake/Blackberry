-- AI Workspace OS v0.1 Supabase schema
-- Design note: v0.1 keeps frontend IDs as text so localStorage state can sync to Supabase
-- without client-side UUID migration. Auth/user IDs remain uuid.

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Member',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists workspaces (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  slug text unique not null,
  owner_id uuid references profiles(id) on delete set null,
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workspace_members (
  workspace_id text references workspaces(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null check (role in ('owner','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists channels (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  name text not null,
  description text not null default '',
  kind text not null default 'general',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  channel_id text references channels(id) on delete set null,
  title text not null,
  kind text not null default 'chat',
  status text not null default 'active',
  model text not null default 'gateway/mock-stream',
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  session_id text references sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  time text not null default to_char(now(), 'HH24:MI'),
  content_json jsonb,
  status text not null default 'done',
  model text,
  parent_message_id text references messages(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists artifacts (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  session_id text references sessions(id) on delete set null,
  title text not null,
  kind text not null,
  content text not null default '',
  version int not null default 1,
  mime_type text,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists memories (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  title text not null,
  content text not null,
  scope text not null default 'workspace',
  active boolean not null default true,
  kind text not null default 'preference',
  source_session_id text references sessions(id) on delete set null,
  confidence numeric default 1.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  title text not null,
  status text not null default 'todo' check (status in ('todo','in_progress','blocked','done')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  session_id text references sessions(id) on delete set null,
  artifact_id text references artifacts(id) on delete set null,
  description text,
  assignee_id uuid references profiles(id) on delete set null,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agent_runs (
  id text primary key default gen_random_uuid()::text,
  workspace_id text references workspaces(id) on delete cascade,
  session_id text references sessions(id) on delete cascade,
  task_id text references tasks(id) on delete set null,
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','cancelled')),
  agent_name text not null,
  input jsonb,
  output jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists channels_workspace_id_idx on channels(workspace_id);
create index if not exists sessions_workspace_id_idx on sessions(workspace_id);
create index if not exists sessions_channel_id_idx on sessions(channel_id);
create index if not exists messages_session_id_idx on messages(session_id);
create index if not exists artifacts_session_id_idx on artifacts(session_id);
create index if not exists tasks_session_id_idx on tasks(session_id);

create or replace function is_workspace_member(target_workspace_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

alter table profiles enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table channels enable row level security;
alter table sessions enable row level security;
alter table messages enable row level security;
alter table artifacts enable row level security;
alter table memories enable row level security;
alter table tasks enable row level security;
alter table agent_runs enable row level security;

create policy profiles_select_self on profiles for select using (id = auth.uid());
create policy profiles_insert_self on profiles for insert with check (id = auth.uid());
create policy profiles_update_self on profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy workspaces_select_member on workspaces for select using (is_workspace_member(id));
create policy workspaces_insert_owner on workspaces for insert with check (owner_id = auth.uid());
create policy workspaces_update_member on workspaces for update using (is_workspace_member(id)) with check (is_workspace_member(id));
create policy workspaces_delete_owner on workspaces for delete using (owner_id = auth.uid());

create policy workspace_members_select_member on workspace_members for select using (is_workspace_member(workspace_id));
create policy workspace_members_insert_owner on workspace_members for insert with check (user_id = auth.uid() or is_workspace_member(workspace_id));
create policy workspace_members_update_member on workspace_members for update using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy workspace_members_delete_member on workspace_members for delete using (is_workspace_member(workspace_id));

create policy channels_select_member on channels for select using (is_workspace_member(workspace_id));
create policy channels_insert_member on channels for insert with check (is_workspace_member(workspace_id));
create policy channels_update_member on channels for update using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy channels_delete_member on channels for delete using (is_workspace_member(workspace_id));

create policy sessions_select_member on sessions for select using (is_workspace_member(workspace_id));
create policy sessions_insert_member on sessions for insert with check (is_workspace_member(workspace_id));
create policy sessions_update_member on sessions for update using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy sessions_delete_member on sessions for delete using (is_workspace_member(workspace_id));

create policy messages_select_member on messages for select using (is_workspace_member(workspace_id));
create policy messages_insert_member on messages for insert with check (is_workspace_member(workspace_id));
create policy messages_update_member on messages for update using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy messages_delete_member on messages for delete using (is_workspace_member(workspace_id));

create policy artifacts_select_member on artifacts for select using (is_workspace_member(workspace_id));
create policy artifacts_insert_member on artifacts for insert with check (is_workspace_member(workspace_id));
create policy artifacts_update_member on artifacts for update using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy artifacts_delete_member on artifacts for delete using (is_workspace_member(workspace_id));

create policy memories_select_member on memories for select using (is_workspace_member(workspace_id));
create policy memories_insert_member on memories for insert with check (is_workspace_member(workspace_id));
create policy memories_update_member on memories for update using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy memories_delete_member on memories for delete using (is_workspace_member(workspace_id));

create policy tasks_select_member on tasks for select using (is_workspace_member(workspace_id));
create policy tasks_insert_member on tasks for insert with check (is_workspace_member(workspace_id));
create policy tasks_update_member on tasks for update using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy tasks_delete_member on tasks for delete using (is_workspace_member(workspace_id));

create policy agent_runs_select_member on agent_runs for select using (is_workspace_member(workspace_id));
create policy agent_runs_insert_member on agent_runs for insert with check (is_workspace_member(workspace_id));
create policy agent_runs_update_member on agent_runs for update using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy agent_runs_delete_member on agent_runs for delete using (is_workspace_member(workspace_id));
