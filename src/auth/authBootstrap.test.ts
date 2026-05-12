import { describe, expect, it } from 'vitest';
import { createAuthRuntime, LocalAuthBootstrap, SupabaseAuthBootstrap } from './authBootstrap';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear(): void { this.data.clear(); }
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.data.keys())[index] ?? null; }
  removeItem(key: string): void { this.data.delete(key); }
  setItem(key: string, value: string): void { this.data.set(key, value); }
}

describe('createAuthRuntime', () => {
  it('uses local dev identity when Supabase env is missing', async () => {
    const runtime = createAuthRuntime({ env: {}, storage: new MemoryStorage() });
    const session = await runtime.bootstrap.ensureSession();

    expect(runtime.backend).toBe('local');
    expect(runtime.label).toBe('Local dev identity');
    expect(runtime.bootstrap).toBeInstanceOf(LocalAuthBootstrap);
    expect(session.profile.displayName).toBe('Local Developer');
    expect(session.workspace.slug).toBe('blackberry-local');
    expect(session.membership.role).toBe('owner');
  });

  it('persists local dev identity in storage', async () => {
    const storage = new MemoryStorage();
    const first = createAuthRuntime({ env: {}, storage });
    const firstSession = await first.bootstrap.ensureSession();
    const second = createAuthRuntime({ env: {}, storage });
    const secondSession = await second.bootstrap.ensureSession();

    expect(secondSession.profile.id).toBe(firstSession.profile.id);
    expect(secondSession.workspace.id).toBe(firstSession.workspace.id);
  });

  it('uses Supabase bootstrap when browser-safe env exists', () => {
    const fakeClient = { auth: {}, from: () => { throw new Error('not used'); } };
    const runtime = createAuthRuntime({
      env: { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'anon' },
      storage: new MemoryStorage(),
      createSupabaseClient: (url, key) => {
        expect(url).toBe('https://example.supabase.co');
        expect(key).toBe('anon');
        return fakeClient;
      },
    });

    expect(runtime.backend).toBe('supabase');
    expect(runtime.label).toBe('Supabase Auth');
    expect(runtime.bootstrap).toBeInstanceOf(SupabaseAuthBootstrap);
  });
});
