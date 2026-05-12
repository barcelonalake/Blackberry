import { initialState } from './initialState';
import type { Artifact, Channel, Memory, Message, Session, Task, WorkspaceState } from '../domain/types';

export const STORAGE_KEY = 'blackberry.ai-workspace-os.v01';

type MaybePromise<T> = T | Promise<T>;

export interface WorkspaceRepository {
  load(): MaybePromise<WorkspaceState>;
  save(next: WorkspaceState): MaybePromise<void>;
  reset(): MaybePromise<WorkspaceState>;
}

type SupabaseResult<T> = Promise<{ data: T[] | null; error: Error | null }>;

type SupabaseTable = {
  select(columns?: string): SupabaseResult<unknown>;
  delete(): { neq(column: string, value: string): Promise<{ error: Error | null }> };
  upsert(payload: unknown[]): Promise<{ error: Error | null }>;
};

type SupabaseLikeClient = {
  from(table: string): SupabaseTable;
};

type WorkspaceTableName = keyof WorkspaceState;

const READ_TABLES: WorkspaceTableName[] = ['channels', 'sessions', 'messages', 'artifacts', 'memories', 'tasks'];
const WRITE_TABLES: WorkspaceTableName[] = ['tasks', 'memories', 'artifacts', 'messages', 'sessions', 'channels'];

export class LocalWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly storage: Storage = window.localStorage) {}

  load(): WorkspaceState {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return initialState;
      return { ...initialState, ...JSON.parse(raw) };
    } catch {
      return initialState;
    }
  }

  save(next: WorkspaceState) {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  reset(): WorkspaceState {
    this.storage.removeItem(STORAGE_KEY);
    return initialState;
  }
}

export class SupabaseWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly client: SupabaseLikeClient) {}

  async load(): Promise<WorkspaceState> {
    const entries = await Promise.all(
      READ_TABLES.map(async (table) => {
        const { data, error } = await this.client.from(table).select('*');
        if (error) throw error;
        return [table, data ?? []] as const;
      }),
    );
    return { ...initialState, ...Object.fromEntries(entries) } as WorkspaceState;
  }

  async save(next: WorkspaceState): Promise<void> {
    for (const table of WRITE_TABLES) {
      const deleteResult = await this.client.from(table).delete().neq('id', '__never__');
      if (deleteResult.error) throw deleteResult.error;
      const payload = next[table] as Channel[] | Session[] | Message[] | Artifact[] | Memory[] | Task[];
      const upsertResult = await this.client.from(table).upsert(payload);
      if (upsertResult.error) throw upsertResult.error;
    }
  }

  async reset(): Promise<WorkspaceState> {
    await this.save(initialState);
    return initialState;
  }
}
