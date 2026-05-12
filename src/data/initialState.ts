import type { WorkspaceState } from '../domain/types';

export const initialState: WorkspaceState = {
  channels: [
    { id: 'product', name: '規劃', description: '產品想法、需求、決策', kind: 'planning' },
    { id: 'agent-lab', name: '執行', description: 'AI 任務、模型執行、重跑', kind: 'agent' },
    { id: 'artifacts', name: '成果', description: '文件、摘要、可交付內容', kind: 'artifact' },
  ],
  sessions: [
    {
      id: 's1',
      channelId: 'product',
      title: '產品工作區',
      kind: 'design',
      status: 'active',
      model: 'kimi-k2.6:cloud',
      summary: '把想法、對話、成果、記憶與任務集中整理。',
    },
    {
      id: 's2',
      channelId: 'agent-lab',
      title: 'AI 執行區',
      kind: 'agent',
      status: 'active',
      model: 'kimi-k2.6:cloud',
      summary: '輸入需求，保存 AI 執行結果，必要時重跑或轉成成果文件。',
    },
  ],
  messages: [
    { id: 'm1', sessionId: 's1', role: 'assistant', content: '這裡可以整理產品想法、討論記錄與下一步任務。', time: '09:20' },
    { id: 'm2', sessionId: 's2', role: 'assistant', content: '輸入需求後，結果會保存在執行記錄，也可以轉成成果文件。', time: '09:24' },
  ],
  artifacts: [
    { id: 'a1', sessionId: 's1', title: '產品整理筆記', kind: 'markdown', version: 1, content: '在這裡保存可編輯的產品筆記、摘要與交付文件。' },
  ],
  memories: [
    { id: 'mem1', title: '使用偏好', content: '手機優先，成果要能直接打開使用。', scope: 'workspace', active: true },
  ],
  tasks: [
    { id: 't1', title: '整理今天要完成的工作', status: 'todo', priority: 'high', sessionId: 's1' },
    { id: 't2', title: '把重要輸出保存成成果文件', status: 'in_progress', priority: 'medium', sessionId: 's2' },
    { id: 't3', title: '複查可交付內容', status: 'done', priority: 'medium', sessionId: 's1' },
  ],
  agentRuns: [],
};
