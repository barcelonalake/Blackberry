import React, { useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Archive,
  Bot,
  Brain,
  CheckCircle2,
  Circle,
  Code2,
  Database,
  FileText,
  Hash,
  Layers3,
  MessageSquare,
  PanelRight,
  Plus,
  RefreshCcw,
  Rocket,
  Send,
  Sparkles,
  Smartphone,
  Workflow,
} from 'lucide-react';
import type { Memory, Message, Session, Task, WorkspaceState } from './domain/types';
import { LocalWorkspaceRepository } from './data/workspaceRepository';
import { AIGatewayClient } from './services/aiGatewayClient';
import './styles.css';

const repository = new LocalWorkspaceRepository();
const gateway = new AIGatewayClient();
const persistenceLabel = import.meta.env.VITE_SUPABASE_URL ? 'Supabase ready' : 'Local repository';

function nowLabel() {
  return new Date().toLocaleTimeString('zh-Hant', { hour: '2-digit', minute: '2-digit' });
}

function App() {
  const [state, setState] = useState<WorkspaceState>(() => repository.load());
  const [activeChannelId, setActiveChannelId] = useState(state.channels[0]?.id ?? 'product');
  const [activeSessionId, setActiveSessionId] = useState(state.sessions[0]?.id ?? 's1');
  const [draft, setDraft] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const stateRef = useRef(state);

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
    stateRef.current = next;
    setState(next);
    repository.save(next);
  }

  function resetWorkspace() {
    const next = repository.reset();
    persist(next);
    setActiveChannelId(next.channels[0]?.id ?? 'product');
    setActiveSessionId(next.sessions[0]?.id ?? 's1');
  }

  function createSession() {
    const id = `s${Date.now()}`;
    const nextSession: Session = {
      id,
      channelId: activeChannel.id,
      title: `New ${activeChannel.name} session`,
      kind: 'chat',
      status: 'active',
      model: 'gateway/mock-stream',
      summary: '新建立的 AI 工作單元；訊息會先保存到 local repository。',
    };
    persist({ ...state, sessions: [nextSession, ...state.sessions] });
    setActiveSessionId(id);
  }

  async function sendMessage() {
    if (!draft.trim() || !activeSession || isStreaming) return;
    const time = nowLabel();
    const userMessage: Message = { id: `m${Date.now()}`, sessionId: activeSession.id, role: 'user', content: draft.trim(), time };
    const assistantId = `m${Date.now() + 1}`;
    const assistantMessage: Message = { id: assistantId, sessionId: activeSession.id, role: 'assistant', content: '', time };
    const seed = { ...state, messages: [...state.messages, userMessage, assistantMessage] };
    persist(seed);
    setDraft('');
    setIsStreaming(true);

    try {
      for await (const chunk of gateway.streamSessionMessage({ sessionId: activeSession.id, messages: [...messages, userMessage] })) {
        if (chunk.done) break;
        const current = stateRef.current;
        const nextMessages = current.messages.map((message) =>
          message.id === assistantId ? { ...message, content: message.content + chunk.delta } : message,
        );
        persist({ ...current, messages: nextMessages });
      }
    } catch (error) {
      const current = stateRef.current;
      const nextMessages = current.messages.map((message) =>
        message.id === assistantId ? { ...message, content: `AI Gateway error: ${String(error)}` } : message,
      );
      persist({ ...current, messages: nextMessages });
    } finally {
      setIsStreaming(false);
    }
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
        <div className="status-stack">
          <div className="status-pill"><Smartphone size={16} /> PWA online</div>
          <div className="status-pill"><Database size={16} /> {persistenceLabel}</div>
        </div>
      </header>

      <section className="metrics">
        {metrics.map(({ label, value, icon: Icon }) => <article key={label}><Icon size={18} /><strong>{value}</strong><span>{label}</span></article>)}
      </section>

      <section className="workspace-grid">
        <aside className="sidebar card-panel">
          <div className="panel-title"><Layers3 size={18} /> Workspace</div>
          <button className="primary-action"><Plus size={16} /> New Workspace</button>
          <button className="ghost" onClick={resetWorkspace}><RefreshCcw size={14} /> Reset local data</button>
          <div className="section-label">Channels</div>
          {state.channels.map((channel) => (
            <button
              className={`channel-row ${channel.id === activeChannelId ? 'active' : ''}`}
              key={channel.id}
              onClick={() => {
                setActiveChannelId(channel.id);
                setActiveSessionId(state.sessions.find((s) => s.channelId === channel.id)?.id ?? activeSessionId);
              }}
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
                <p>{message.content || (message.role === 'assistant' && isStreaming ? 'Streaming…' : '')}</p>
              </article>
            ))}
          </div>

          <div className="composer">
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="輸入需求：例如『把這段回答轉成 artifact』" />
            <button onClick={sendMessage} disabled={isStreaming}><Send size={18} /> {isStreaming ? 'Streaming' : 'Send'}</button>
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
        <Rocket size={16} /> Next: connect Supabase Auth / Postgres, then switch mock gateway to FastAPI SSE.
      </footer>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
