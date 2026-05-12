# Auth Bootstrap

Blackberry now has an auth bootstrap abstraction that keeps GitHub Pages usable without secrets while preparing for real Supabase Auth.

## Runtime selection

- Missing `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` → `LocalAuthBootstrap`
- Both env vars present → `SupabaseAuthBootstrap`

## Local dev identity

Local mode creates and persists a browser-only identity:

```text
profile: Local Developer
workspace: Blackberry Local
membership: owner
```

This lets the PWA exercise the same UI path as a real authenticated workspace without requiring a Supabase project.

## Supabase path

The current Supabase adapter validates that a user is signed in with `auth.getUser()`. The next production step is to extend it from read-only session detection into full bootstrap writes:

1. `profiles` upsert for current user
2. default `workspaces` creation
3. `workspace_members` owner row creation
4. workspace-scoped repository reads/writes
5. realtime subscriptions

Service-role keys must stay server-side only. The Vite app may only receive anon/public browser-safe config.
