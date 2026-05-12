import { initialState } from './initialState';
import type { WorkspaceState } from '../domain/types';

export const STORAGE_KEY = 'blackberry.ai-workspace-os.v01';

export interface WorkspaceRepository {
  load(): WorkspaceState;
  save(next: WorkspaceState): void;
  reset(): WorkspaceState;
}

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
  load(): WorkspaceState {
    throw new Error('Supabase adapter is not configured yet. Use LocalWorkspaceRepository in v0.1.');
  }

  save() {
    throw new Error('Supabase adapter is not configured yet. Use LocalWorkspaceRepository in v0.1.');
  }

  reset(): WorkspaceState {
    throw new Error('Supabase adapter is not configured yet. Use LocalWorkspaceRepository in v0.1.');
  }
}
