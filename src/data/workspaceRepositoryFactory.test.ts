import { describe, expect, it } from 'vitest';
import { LocalWorkspaceRepository, SupabaseWorkspaceRepository } from './workspaceRepository';
import { createWorkspaceRepository } from './workspaceRepositoryFactory';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear(): void { this.data.clear(); }
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.data.keys())[index] ?? null; }
  removeItem(key: string): void { this.data.delete(key); }
  setItem(key: string, value: string): void { this.data.set(key, value); }
}

describe('createWorkspaceRepository', () => {
  it('uses local repository when Supabase env is missing', () => {
    const repo = createWorkspaceRepository({
      env: {},
      storage: new MemoryStorage(),
      createSupabaseClient: () => { throw new Error('should not create Supabase client'); },
    });

    expect(repo).toBeInstanceOf(LocalWorkspaceRepository);
  });

  it('uses Supabase repository when url and anon key exist', () => {
    const fakeClient = { from: () => { throw new Error('not used in factory test'); } };
    const repo = createWorkspaceRepository({
      env: { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'public-anon-key' },
      storage: new MemoryStorage(),
      createSupabaseClient: (url, key) => {
        expect(url).toBe('https://example.supabase.co');
        expect(key).toBe('public-anon-key');
        return fakeClient;
      },
    });

    expect(repo).toBeInstanceOf(SupabaseWorkspaceRepository);
  });
});
