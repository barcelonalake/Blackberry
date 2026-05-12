# Supabase Production Readiness Notes

## Current milestone

The schema now matches the v0.1 frontend repository contract:

- `channels.id` is `text`
- `sessions.channel_id` maps from frontend `channelId`
- `messages.session_id` + `messages.time` map from frontend `sessionId/time`
- `memories.active` maps from frontend `active`
- `tasks.session_id` maps from frontend `sessionId`

This deliberately keeps app-level IDs as `text` so existing localStorage sessions can sync into Supabase without client-side UUID conversion. Auth user IDs remain `uuid`.

## Tables

Core tables:

- `profiles`
- `workspaces`
- `workspace_members`
- `channels`
- `sessions`
- `messages`
- `artifacts`
- `memories`
- `tasks`
- `agent_runs`

## RLS model

All tables enable RLS. Access is based on:

```sql
is_workspace_member(workspace_id)
```

The owner creates a workspace, gets added to `workspace_members`, then all workspace-scoped reads/writes are gated by membership.

## Before applying to a real Supabase project

1. Create project in Supabase.
2. Apply `supabase/migrations/0001_initial_schema.sql`.
3. Create first workspace and membership row after user signup.
4. Add env vars locally or in deploy environment:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Keep `service_role` only on server-side services, never in Vite.

## Next implementation step

Add an Auth gate in the PWA:

- sign in / sign out
- `profiles` bootstrap on first login
- default workspace creation
- workspace member bootstrap
- only then switch live UI from local-only state to Supabase-backed state
