export type Channel = { id: string; name: string; description: string; kind: string };

export type Session = {
  id: string;
  channelId: string;
  title: string;
  kind: string;
  status: string;
  model: string;
  summary: string;
};

export type Message = {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  time: string;
};

export type Artifact = {
  id: string;
  sessionId: string;
  title: string;
  kind: string;
  content: string;
  version: number;
};

export type Memory = {
  id: string;
  title: string;
  content: string;
  scope: string;
  active: boolean;
};

export type Task = {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high';
  sessionId: string;
};

export type AgentRun = {
  id: string;
  sessionId: string;
  provider: string;
  model: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  input: string;
  output: string;
  startedAt: string;
  completedAt?: string;
};

export type WorkspaceState = {
  channels: Channel[];
  sessions: Session[];
  messages: Message[];
  artifacts: Artifact[];
  memories: Memory[];
  tasks: Task[];
  agentRuns: AgentRun[];
};
