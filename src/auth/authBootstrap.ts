import { createClient } from '@supabase/supabase-js';

export type AuthProfile = {
  id: string;
  displayName: string;
  avatarUrl?: string;
};

export type AuthWorkspace = {
  id: string;
  name: string;
  slug: string;
};

export type AuthMembership = {
  workspaceId: string;
  userId: string;
  role: 'owner' | 'member' | 'viewer';
};

export type AuthBootstrapSession = {
  profile: AuthProfile;
  workspace: AuthWorkspace;
  membership: AuthMembership;
};

export interface AuthBootstrap {
  ensureSession(): Promise<AuthBootstrapSession>;
  signOut(): Promise<void>;
}

type AuthEnv = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
};

type SupabaseAuthLikeClient = {
  auth?: {
    getUser?: () => Promise<{ data?: { user?: { id: string; email?: string } | null }; error?: Error | null }>;
    signOut?: () => Promise<{ error?: Error | null }>;
  };
  from?: (table: string) => unknown;
};

type AuthRuntimeOptions = {
  env: AuthEnv;
  storage?: Storage;
  createSupabaseClient?: (url: string, anonKey: string) => SupabaseAuthLikeClient;
};

export type AuthRuntime = {
  bootstrap: AuthBootstrap;
  label: 'Local dev identity' | 'Supabase Auth';
  backend: 'local' | 'supabase';
};

const LOCAL_AUTH_KEY = 'blackberry.auth.local-dev.v01';

function id(prefix: string) {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export class LocalAuthBootstrap implements AuthBootstrap {
  constructor(private readonly storage: Storage = window.localStorage) {}

  async ensureSession(): Promise<AuthBootstrapSession> {
    const raw = this.storage.getItem(LOCAL_AUTH_KEY);
    if (raw) return JSON.parse(raw) as AuthBootstrapSession;

    const profile: AuthProfile = { id: id('local_user'), displayName: 'Local Developer' };
    const workspace: AuthWorkspace = { id: 'local_workspace', name: 'Blackberry Local', slug: 'blackberry-local' };
    const membership: AuthMembership = { workspaceId: workspace.id, userId: profile.id, role: 'owner' };
    const session = { profile, workspace, membership };
    this.storage.setItem(LOCAL_AUTH_KEY, JSON.stringify(session));
    return session;
  }

  async signOut(): Promise<void> {
    this.storage.removeItem(LOCAL_AUTH_KEY);
  }
}

export class SupabaseAuthBootstrap implements AuthBootstrap {
  constructor(private readonly client: SupabaseAuthLikeClient) {}

  async ensureSession(): Promise<AuthBootstrapSession> {
    const { data, error } = await this.client.auth?.getUser?.() ?? {};
    if (error) throw error;
    const user = data?.user;
    if (!user) throw new Error('Supabase user is not signed in');

    const profile: AuthProfile = { id: user.id, displayName: user.email ?? 'Supabase Member' };
    const workspace: AuthWorkspace = { id: 'default', name: 'Blackberry', slug: 'blackberry' };
    const membership: AuthMembership = { workspaceId: workspace.id, userId: user.id, role: 'owner' };
    return { profile, workspace, membership };
  }

  async signOut(): Promise<void> {
    const result = await this.client.auth?.signOut?.();
    if (result?.error) throw result.error;
  }
}

function defaultCreateSupabaseClient(url: string, anonKey: string): SupabaseAuthLikeClient {
  return createClient(url, anonKey) as unknown as SupabaseAuthLikeClient;
}

export function createAuthRuntime(options: AuthRuntimeOptions): AuthRuntime {
  const url = options.env.VITE_SUPABASE_URL?.trim();
  const anonKey = options.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (url && anonKey) {
    const client = (options.createSupabaseClient ?? defaultCreateSupabaseClient)(url, anonKey);
    return { bootstrap: new SupabaseAuthBootstrap(client), label: 'Supabase Auth', backend: 'supabase' };
  }

  return { bootstrap: new LocalAuthBootstrap(options.storage), label: 'Local dev identity', backend: 'local' };
}
