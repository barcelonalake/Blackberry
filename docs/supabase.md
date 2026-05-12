# Supabase Persistence

Blackberry currently ships with localStorage persistence so the public GitHub Pages preview works without secrets.

## Browser-safe variables

Create a local `.env.local` from `.env.example`:

```bash
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<public-anon-key>
VITE_AI_GATEWAY_URL=http://localhost:8000
```

Never commit `.env.local`. Do not place `service_role` keys in Vite variables.

## Current adapter status

- `LocalWorkspaceRepository`: active default, used by GitHub Pages preview.
- `SupabaseWorkspaceRepository`: typed adapter with `load/save/reset` contract and tests using a fake Supabase client.
- Next step: install `@supabase/supabase-js`, create a real client factory, then switch repository selection when both public env vars exist.

## Migration

Initial schema draft lives at:

```text
supabase/migrations/0001_initial_schema.sql
```

Apply it only after the Supabase project exists and Auth settings are ready.
