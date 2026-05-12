import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Archive,
  Bot,
  Brain,
  CheckCircle2,
  Circle,
  Code2,
  FileText,
  Hash,
  Layers3,
  MessageSquare,
  PanelRight,
  Plus,
  Rocket,
  Send,
  Sparkles,
  Smartphone,
  Workflow,
} from 'lucide-react';
import './styles.css';

type Channel = { id: string; name: string; description: string; kind: string };
type Session = { id: string; channelId: string; title: string; kind: string; status: string; model: string; summary: string };
type Message = { id: string; sessionId: string; role: 'user' | 'assistant' | 'system'; content: string; time: string };
type Artifact = { id: string; sessionId: string; title: string; kind: string; content: string; version: number };
type Memory = { id: string; title: string; content: string; scope: string; active: boolean };
type Task = { id: string; title: string; status: 'todo' | 'in_progress' | 'blocked' | 'done'; priority: 'low' | 'medium' | 'high'; sessionId: string };

type WorkspaceState = {
  channels: Channel[];
  sessions: Session[];
  messages: Message[];
  artifacts: Artifact[];
  memories: Memory[];
  tasks: Task[];
};

const STORAGE_KEY = 'blackberry.ai-workspace-os.v01';

const initialState: WorkspaceState = {
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
    { id: 't4', title: '接 AI Gateway SSE streaming', status: 'todo', priority: 'medium', sessionId: 's1' },
  ],
};

function loadState(): WorkspaceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    return { ...initialState, ...JSON.parse(raw) };
  } catch {
    return initialState;
  }
}

function App() {
  const [state, setState] = useState<WorkspaceState>(loadState);
  const [activeChannelId, setActiveChannelId] = useState(state.channels[0]?.id ?? 'product');
  const [activeSessionId, setActiveSessionId] = useState(state.sessions[0]?.id ?? 's1');
  const [draft, setDraft] = useState('');

  const activeChannel = state.channels.find((channel) => channel.id === activeChannelId) ?? state.channels[0];
  const channelSessions = state.sessions.filter((session) => session.channelId === activeChannelId);
  const activeSession = state.sessions.find((session) => session.id === activeSessionId) ?? channelSessions[0] ?? state.sessions[0];
  const messages = state.messages.filter((message) => message.sessionId === activeSession?.id);
  const sessionArtifacts = state.artifacts.filter((artifact) => artifact.sessionId === activeSession?.id);

  const metrics = useMemo(() => [
    { label: 'Channels', value: state.channels.length, icon: Hash },
    { label: 'Sessions', value: state.sessions.length, icon: MessageSquare },
    { label: 'Artifacts', value: state.artifacts.length, icon: Archive },
    { label: 'Tasks', value: state.tasks.length, icon: CheckCircle2 },
  ], [state]);

  function persist(next: WorkspaceState) {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function createSession() {
    const id = `s${Date.now()}`;
    const nextSession: Session = {
      id,
      channelId: activeChannel.id,
      title: `New ${activeChannel.name} session`,
      kind: 'chat',
      status: 'active',
      model: 'gateway/default',
      summary: '新建立的 AI 工作單元。',
    };
    persist({ ...state, sessions: [nextSession, ...state.sessions] });
    setActiveSessionId(id);
  }

  function sendMessage() {
    if (!draft.trim() || !activeSession) return;
    const now = new Date().toLocaleTimeString('zh-Hant', { hour: '2-digit', minute: '2-digit' });
    const userMessage: Message = { id: `m${Date.now()}`, sessionId: activeSession.id, role: 'user', content: draft.trim(), time: now };
    const assistantMessage: Message = {
      id: `m${Date.now() + 1}`,
      sessionId: activeSession.id,
      role: 'assistant',
      content: '已收到。v0.1 目前是本地 PWA shell；下一步會把這條訊息經 AI Gateway SSE 送到模型，並保存到 Supabase messages。',
      time: now,
    };
    persist({ ...state, messages: [...state.messages, userMessage, assistantMessage] });
    setDraft('');
  }

  function addTaskFromSession() {
    if (!activeSession) return;
    const nextTask: Task = { id: `t${Date.now()}`, title: `Follow up: ${activeSession.title}`, status: 'todo', priority: 'medium', sessionId: activeSession.id };
    persist({ ...state, tasks: [nextTask, ...state.tasks] });
  }

  function addMemoryFromSession() {
    if (!activeSession) return;
    const nextMemory: Memory = { id: `mem${Date.now()}`, title: activeSession.title, content: activeSession.summary, scope: 'workspace', active: true };
    persist({ ...state, memories: [nextMemory, ...state.memories] });
  }

  return (
    <main className="workspace-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow"><Sparkles size={14} /> AI Workspace OS · v0.1</div>
          <h1>Blackberry</h1>
          <p>Discord-like AI 工作空間：Session、Artifact、Memory、Task Board 在手機上形成閉環。</p>
        </div>
        <div className="status-pill"><Smartphone size={16} /> PWA online</div>
      </header>

      <section className="metrics">
        {metrics.map(({ label, value, icon: Icon }) => <article key={label}><Icon size={18} /><strong>{value}</strong><span>{label}</span></article>)}
      </section>

      <section className="workspace-grid">
        <aside className="sidebar card-panel">
          <div className="panel-title"><Layers3 size={18} /> Workspace</div>
          <button className="primary-action"><Plus size={16} /> New Workspace</button>
          <div className="section-label">Channels</div>
          {state.channels.map((channel) => (
            <button
              className={`channel-row ${channel.id === activeChannelId ? 'active' : ''}`}
              key={channel.id}
              onClick={() => { setActiveChannelId(channel.id); setActiveSessionId(state.sessions.find((s) => s.channelId === channel.id)?.id ?? activeSessionId); }}
            >
              <Hash size={16} />
              <span><b>{channel.name}</b><small>{channel.description}</small></span>
            </button>
          ))}
        </aside>

        <section className="session-list card-panel">
          <div className="panel-title"><MessageSquare size={18} /> {activeChannel?.name}</div>
          <button className="primary-action" onClick={createSession}><Plus size={16} /> New Session</button>
          {channelSessions.map((session) => (
            <button className={`session-row ${session.id === activeSession?.id ? 'active' : ''}`} key={session.id} onClick={() => setActiveSessionId(session.id)}>
              <span className="session-kind">{session.kind}</span>
              <b>{session.title}</b>
              <small>{session.summary}</small>
              <em>{session.model}</em>
            </button>
          ))}
        </section>

        <section className="thread card-panel">
          <div className="thread-header">
            <div>
              <div className="panel-title"><Bot size={18} /> {activeSession?.title}</div>
              <p>{activeSession?.summary}</p>
            </div>
            <button onClick={addTaskFromSession}><Workflow size={16} /> Task</button>
          </div>

          <div className="messages">
            {messages.map((message) => (
              <article className={`message ${message.role}`} key={message.id}>
                <div><b>{message.role}</b><time>{message.time}</time></div>
                <p>{message.content}</p>
              </article>
            ))}
          </div>

          <div className="composer">
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="輸入需求：例如『把這段回答轉成 artifact』" />
            <button onClick={sendMessage}><Send size={18} /> Send</button>
          </div>
        </section>

        <aside className="context-panel card-panel">
          <div className="panel-title"><PanelRight size={18} /> Context Panel</div>

          <section>
            <h2><Archive size={16} /> Artifacts</h2>
            {sessionArtifacts.map((artifact) => <article className="mini-card" key={artifact.id}><FileText size={15} /><b>{artifact.title}</b><small>{artifact.kind} · v{artifact.version}</small><p>{artifact.content}</p></article>)}
          </section>

          <section>
            <h2><Brain size={16} /> Memories</h2>
            <button className="ghost" onClick={addMemoryFromSession}><Plus size={14} /> Save current session</button>
            {state.memories.map((memory) => <article className="mini-card" key={memory.id}><Circle size={12} className={memory.active ? 'green' : ''} /><b>{memory.title}</b><p>{memory.content}</p></article>)}
          </section>

          <section>
            <h2><CheckCircle2 size={16} /> Task Board</h2>
            {(['todo', 'in_progress', 'blocked', 'done'] as Task['status'][]).map((status) => (
              <div className="task-column" key={status}>
                <span>{status.replace('_', ' ')}</span>
                {state.tasks.filter((task) => task.status === status).map((task) => <article className="task" key={task.id}><Code2 size={14} /><b>{task.title}</b><small>{task.priority}</small></article>)}
              </div>
            ))}
          </section>
        </aside>
      </section>

      <footer>
        <Rocket size={16} /> Next: Supabase Auth → session persistence → AI Gateway SSE streaming → artifact editor.
      </footer>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
