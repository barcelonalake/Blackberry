import type { WorkspaceState } from '../domain/types';

export const initialState: WorkspaceState = {
  channels: [
    { id: 'product', name: 'product', description: '產品定位、PRD、roadmap、決策記錄', kind: 'planning' },
    { id: 'agent-lab', name: 'agent-lab', description: 'Claude Code / Codex / Hermes 任務執行', kind: 'agent' },
    { id: 'artifacts', name: 'artifacts', description: 'HTML、Markdown、code、diagram、prompt template', kind: 'artifact' },
  ],
  sessions: [
    {
      id: 's1',
      channelId: 'product',
      title: 'AI Workspace OS v0.1 閉環設計',
      kind: 'design',
      status: 'active',
      model: 'kimi-k2.6:cloud',
      summary: '人提出問題 → AI 工作 → artifact → memory → task → 回到 session 執行。',
    },
    {
      id: 's2',
      channelId: 'agent-lab',
      title: 'Blackberry PWA 第一版實作',
      kind: 'coding-agent',
      status: 'active',
      model: 'claude-code',
      summary: '建立手機優先 workspace shell，預留 Supabase 與 AI Gateway。',
    },
  ],
  messages: [
    { id: 'm1', sessionId: 's1', role: 'user', content: '根據 AI Workspace OS 文檔，先做 v0.1 的可操作產品外殼。', time: '09:20' },
    { id: 'm2', sessionId: 's1', role: 'assistant', content: '已拆成 Workspace / Channel / Session / Message / Artifact / Memory / Task 的核心資訊架構，先用 PWA 驗證。', time: '09:21' },
    { id: 'm3', sessionId: 's2', role: 'assistant', content: '下一步會接入 Supabase Auth、session persistence、AI Gateway SSE streaming。', time: '09:24' },
  ],
  artifacts: [
    { id: 'a1', sessionId: 's1', title: 'v0.1 Product Architecture', kind: 'markdown', version: 1, content: 'PRD / data model / architecture docs 已落在 docs/。' },
    { id: 'a2', sessionId: 's2', title: 'Supabase initial schema', kind: 'sql', version: 1, content: '0001_initial_schema.sql 建立 profiles、workspaces、channels、sessions、messages、artifacts、memories、tasks、agent_runs。' },
  ],
  memories: [
    { id: 'mem1', title: '交付偏好', content: '手機優先，所有成果要能用 URL 在手機打開驗收。', scope: 'workspace', active: true },
    { id: 'mem2', title: '產品方向', content: '不是普通聊天工具，而是 AI 工作空間。', scope: 'workspace', active: true },
  ],
  tasks: [
    { id: 't1', title: '建立 repo 結構與 docs', status: 'done', priority: 'high', sessionId: 's2' },
    { id: 't2', title: '建立 Supabase migration draft', status: 'done', priority: 'high', sessionId: 's2' },
    { id: 't3', title: '實作手機版 Workspace Shell', status: 'in_progress', priority: 'high', sessionId: 's2' },
    { id: 't4', title: '接 AI Gateway SSE streaming', status: 'done', priority: 'medium', sessionId: 's1' },
    { id: 't5', title: '建立 v0.3 provider adapter 與 agent run queue', status: 'in_progress', priority: 'high', sessionId: 's2' },
  ],
  agentRuns: [
    {
      id: 'run1',
      sessionId: 's2',
      provider: 'mock',
      model: 'gateway/mock-stream',
      status: 'completed',
      input: '建立 v0.3 agent runtime',
      output: '已規劃 provider adapter、agent run queue、SSE fallback。',
      startedAt: '09:30',
      completedAt: '09:31',
    },
  ],
};

