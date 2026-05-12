import { createClient } from '@supabase/supabase-js';
import { LocalWorkspaceRepository, SupabaseWorkspaceRepository, type SupabaseLikeClient, type WorkspaceRepository } from './workspaceRepository';

type RepositoryEnv = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
};

type RepositoryFactoryOptions = {
  env: RepositoryEnv;
  storage?: Storage;
  createSupabaseClient?: (url: string, anonKey: string) => SupabaseLikeClient;
};

export type RepositoryRuntime = {
  repository: WorkspaceRepository;
  label: 'Local repository' | 'Supabase connected';
  backend: 'local' | 'supabase';
};

function defaultCreateSupabaseClient(url: string, anonKey: string): SupabaseLikeClient {
  return createClient(url, anonKey) as unknown as SupabaseLikeClient;
}

export function createWorkspaceRuntime(options: RepositoryFactoryOptions): RepositoryRuntime {
  const url = options.env.VITE_SUPABASE_URL?.trim();
  const anonKey = options.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (url && anonKey) {
    const client = (options.createSupabaseClient ?? defaultCreateSupabaseClient)(url, anonKey);
    return {
      repository: new SupabaseWorkspaceRepository(client),
      label: 'Supabase connected',
      backend: 'supabase',
    };
  }

  return {
    repository: new LocalWorkspaceRepository(options.storage),
    label: 'Local repository',
    backend: 'local',
  };
}

export function createWorkspaceRepository(options: RepositoryFactoryOptions): WorkspaceRepository {
  return createWorkspaceRuntime(options).repository;
}
