import { describe, expect, it } from 'vitest';
import { initialState } from './initialState';
import { LocalWorkspaceRepository, SupabaseWorkspaceRepository } from './workspaceRepository';
import type { WorkspaceState } from '../domain/types';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear(): void { this.data.clear(); }
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.data.keys())[index] ?? null; }
  removeItem(key: string): void { this.data.delete(key); }
  setItem(key: string, value: string): void { this.data.set(key, value); }
}

function cloneState(): WorkspaceState {
  return JSON.parse(JSON.stringify(initialState));
}

function createSupabaseMock(seed = cloneState()) {
  const rows = new Map<string, unknown[]>();
  rows.set('channels', seed.channels);
  rows.set('sessions', seed.sessions);
  rows.set('messages', seed.messages);
  rows.set('artifacts', seed.artifacts);
  rows.set('memories', seed.memories);
  rows.set('tasks', seed.tasks);
  const deletes: string[] = [];
  const upserts: Record<string, unknown[]> = {};

  return {
    deletes,
    upserts,
    from(table: string) {
      return {
        select: () => Promise.resolve({ data: rows.get(table) ?? [], error: null }),
        delete: () => ({ neq: () => { deletes.push(table); rows.set(table, []); return Promise.resolve({ error: null }); } }),
        upsert: (payload: unknown[]) => { upserts[table] = payload; rows.set(table, payload); return Promise.resolve({ error: null }); },
      };
    },
  };
}

describe('LocalWorkspaceRepository', () => {
  it('loads initial state, saves state, and resets persisted data', () => {
    const storage = new MemoryStorage();
    const repo = new LocalWorkspaceRepository(storage);
    expect(repo.load().sessions.length).toBe(initialState.sessions.length);

    const next = cloneState();
    next.sessions = [];
    repo.save(next);
    expect(repo.load().sessions).toEqual([]);

    expect(repo.reset().sessions.length).toBe(initialState.sessions.length);
    expect(repo.load().sessions.length).toBe(initialState.sessions.length);
  });
});

describe('SupabaseWorkspaceRepository', () => {
  it('loads workspace tables into a WorkspaceState', async () => {
    const supabase = createSupabaseMock();
    const repo = new SupabaseWorkspaceRepository(supabase);

    const state = await repo.load();

    expect(state.channels).toEqual(initialState.channels);
    expect(state.sessions).toEqual(initialState.sessions);
    expect(state.messages).toEqual(initialState.messages);
  });

  it('saves workspace tables with deterministic delete then upsert order', async () => {
    const supabase = createSupabaseMock();
    const repo = new SupabaseWorkspaceRepository(supabase);
    const state = cloneState();
    state.messages = [];

    await repo.save(state);

    expect(supabase.deletes).toEqual(['tasks', 'memories', 'artifacts', 'messages', 'sessions', 'channels']);
    expect(supabase.upserts.sessions).toEqual(state.sessions);
    expect(supabase.upserts.messages).toEqual([]);
  });
});
