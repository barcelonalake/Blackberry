import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  UserRound,
  Workflow,
} from 'lucide-react';
import type { Artifact, Memory, Message, Session, Task, WorkspaceState } from './domain/types';
import { createWorkspaceRuntime } from './data/workspaceRepositoryFactory';
import { createAuthRuntime, type AuthBootstrapSession } from './auth/authBootstrap';
import { initialState } from './data/initialState';
import { AIGatewayClient } from './services/aiGatewayClient';
import './styles.css';

const env = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

const runtime = createWorkspaceRuntime({
  env,
  storage: window.localStorage,
});
const authRuntime = createAuthRuntime({ env, storage: window.localStorage });
const repository = runtime.repository;
const gateway = new AIGatewayClient();

const APP_VERSION = 'v0.2.1';
const ROADMAP_URL = 'https://barcelonalake.github.io/hosthtml/artifacts/ai-workspace-roadmap.html';
const roadmapVersions = [
  { version: 'v0.1', label: 'HTML Prototype', status: 'done', detail: '資訊架構與三欄視覺已驗證。' },
  { version: 'v0.2', label: 'Web MVP', status: 'active', detail: 'PWA、local persistence、Auth bootstrap、Artifact 版本化。' },
  { version: 'v0.3', label: 'Multi-model Agent', status: 'next', detail: 'AI Gateway、provider adapter、agent run queue。' },
  { version: 'v1.0', label: 'Native + Web Stable', status: 'later', detail: 'SwiftUI 原生端與穩定同步。' },
] as const;

function nowLabel() {
  return new Date().toLocaleTimeString('zh-Hant', { hour: '2-digit', minute: '2-digit' });
}

function App() {
  const [state, setState] = useState<WorkspaceState>(initialState);
  const [activeChannelId, setActiveChannelId] = useState(initialState.channels[0]?.id ?? 'product');
  const [activeSessionId, setActiveSessionId] = useState(initialState.sessions[0]?.id ?? 's1');
  const [draft, setDraft] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'loading' | 'synced' | 'saving' | 'error'>('loading');
  const [authSession, setAuthSession] = useState<AuthBootstrapSession | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [syncError, setSyncError] = useState('');
  const stateRef = useRef(state);

  useEffect(() => {
    let cancelled = false;
    async function bootstrapAuth() {
      try {
        const session = await authRuntime.bootstrap.ensureSession();
        if (cancelled) return;
        setAuthSession(session);
        setAuthStatus('ready');
      } catch (error) {
        if (cancelled) return;
        setSyncError(String(error));
        setAuthStatus('error');
      }
    }
    bootstrapAuth();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        const loaded = await repository.load();
        if (cancelled) return;
        stateRef.current = loaded;
        setState(loaded);
        setActiveChannelId(loaded.channels[0]?.id ?? 'product');
        setActiveSessionId(loaded.sessions[0]?.id ?? 's1');
        setSyncStatus('synced');
      } catch (error) {
        if (cancelled) return;
        setSyncError(String(error));
        setSyncStatus('error');
      }
    }
    bootstrap();
    return () => { cancelled = true; };
  }, []);

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

  async function persist(next: WorkspaceState) {
    stateRef.current = next;
    setState(next);
    setSyncStatus('saving');
    try {
      await repository.save(next);
      setSyncStatus('synced');
      setSyncError('');
    } catch (error) {
      setSyncStatus('error');
      setSyncError(String(error));
    }
  }

  async function resetWorkspace() {
    try {
      setSyncStatus('saving');
      const next = await repository.reset();
      stateRef.current = next;
      setState(next);
      setActiveChannelId(next.channels[0]?.id ?? 'product');
      setActiveSessionId(next.sessions[0]?.id ?? 's1');
      setSyncStatus('synced');
      setSyncError('');
    } catch (error) {
      setSyncStatus('error');
      setSyncError(String(error));
    }
  }

  function createSession() {
    const id = `s${Date.now()}`;
    const nextSession: Session = {
      id,
      channelId: activeChannel.id,
      title: `New ${activeChannel.name} session`,
      kind: 'chat',
      status: 'active',
      model: runtime.backend === 'supabase' ? 'gateway/supabase' : 'gateway/mock-stream',
      summary: `新建立的 AI 工作單元；目前使用 ${runtime.label}。`,
    };
    persist({ ...state, sessions: [nextSession, ...state.sessions] });
    setActiveSessionId(id);
  }

  async function sendMessage() {
    if (!draft.trim() || !activeSession || isStreaming || syncStatus === 'loading') return;
    const time = nowLabel();
    const userMessage: Message = { id: `m${Date.now()}`, sessionId: activeSession.id, role: 'user', content: draft.trim(), time };
    const assistantId = `m${Date.now() + 1}`;
    const assistantMessage: Message = { id: assistantId, sessionId: activeSession.id, role: 'assistant', content: '', time };
    const seed = { ...state, messages: [...state.messages, userMessage, assistantMessage] };
    await persist(seed);
    setDraft('');
    setIsStreaming(true);

    try {
      for await (const chunk of gateway.streamSessionMessage({ sessionId: activeSession.id, messages: [...messages, userMessage] })) {
        if (chunk.done) break;
        const current = stateRef.current;
        const nextMessages = current.messages.map((message) =>
          message.id === assistantId ? { ...message, content: message.content + chunk.delta } : message,
        );
        await persist({ ...current, messages: nextMessages });
      }
    } catch (error) {
      const current = stateRef.current;
      const nextMessages = current.messages.map((message) =>
        message.id === assistantId ? { ...message, content: `AI Gateway error: ${String(error)}` } : message,
      );
      await persist({ ...current, messages: nextMessages });
    } finally {
      setIsStreaming(false);
    }
  }

  function addTaskFromSession() {
    if (!activeSession) return;
    const nextTask: Task = { id: `t${Date.now()}`, title: `Follow up: ${activeSession.title}`, status: 'todo', priority: 'medium', sessionId: activeSession.id };
    persist({ ...state, tasks: [nextTask, ...state.tasks] });
  }

  function createArtifactFromSession() {
    if (!activeSession) return;
    const sourceMessage = [...messages].reverse().find((message) => message.content.trim());
    const nextVersion = Math.max(0, ...sessionArtifacts.map((artifact) => artifact.version)) + 1;
    const content = sourceMessage?.content.trim() || activeSession.summary;
    const nextArtifact: Artifact = {
      id: `a${Date.now()}`,
      sessionId: activeSession.id,
      title: `${activeSession.title} · ${APP_VERSION} artifact`,
      kind: 'markdown',
      version: nextVersion,
      content,
    };
    persist({ ...state, artifacts: [nextArtifact, ...state.artifacts] });
  }

  function addMemoryFromSession() {
    if (!activeSession) return;
    const nextMemory: Memory = { id: `mem${Date.now()}`, title: activeSession.title, content: activeSession.summary, scope: 'workspace', active: true };
    persist({ ...state, memories: [nextMemory, ...state.memories] });
  }

  async function resetAuthIdentity() {
    try {
      setAuthStatus('loading');
      await authRuntime.bootstrap.signOut();
      const session = await authRuntime.bootstrap.ensureSession();
      setAuthSession(session);
      setAuthStatus('ready');
      setSyncError('');
    } catch (error) {
      setAuthStatus('error');
      setSyncError(String(error));
    }
  }

  return (
    <main className="workspace-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow"><Sparkles size={14} /> AI Workspace OS · {APP_VERSION}</div>
          <h1>Blackberry</h1>
          <p>Discord-like AI 工作空間：Session、Artifact、Memory、Task Board 在手機上形成閉環。</p>
        </div>
        <div className="status-stack">
          <div className="status-pill"><Smartphone size={16} /> PWA online</div>
          <div className="status-pill"><Database size={16} /> {runtime.label} · {syncStatus}</div>
        </div>
      </header>

      {syncStatus === 'error' && <section className="sync-error">Sync error: {syncError}</section>}
      {authStatus === 'error' && <section className="sync-error">Auth error: {syncError}</section>}

      <section className="auth-card">
        <div className="panel-title"><UserRound size={18} /> Auth bootstrap</div>
        <div>
          <b>{authSession?.profile.displayName ?? 'Bootstrapping identity…'}</b>
          <small>{authRuntime.label} · {authStatus}</small>
        </div>
        <div>
          <b>{authSession?.workspace.name ?? 'Workspace pending'}</b>
          <small>{authSession?.membership.role ?? 'member'} · {authSession?.workspace.slug ?? 'no-slug'}</small>
        </div>
        <button className="ghost compact" onClick={resetAuthIdentity} disabled={authStatus === 'loading'}>Refresh identity</button>
      </section>

      <section className="roadmap-card">
        <div className="roadmap-head">
          <div>
            <div className="panel-title"><Rocket size={18} /> Version roadmap</div>
            <p>參考 roadmap：目前標注為 <b>{APP_VERSION}</b>，屬於 v0.2 Web MVP 階段。</p>
          </div>
          <a href={ROADMAP_URL} target="_blank" rel="noreferrer">Open roadmap</a>
        </div>
        <div className="roadmap-strip">
          {roadmapVersions.map((item) => (
            <article className={`version-card ${item.status}`} key={item.version}>
              <span>{item.version}</span>
              <b>{item.label}</b>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="metrics">
        {metrics.map(({ label, value, icon: Icon }) => <article key={label}><Icon size={18} /><strong>{value}</strong><span>{label}</span></article>)}
      </section>

      <section className="workspace-grid">
        <aside className="sidebar card-panel">
          <div className="panel-title"><Layers3 size={18} /> Workspace</div>
          <button className="primary-action"><Plus size={16} /> New Workspace</button>
          <button className="ghost" onClick={resetWorkspace} disabled={syncStatus === 'loading'}><RefreshCcw size={14} /> Reset data</button>
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
          <button className="primary-action" onClick={createSession} disabled={syncStatus === 'loading'}><Plus size={16} /> New Session</button>
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
            <button onClick={addTaskFromSession} disabled={syncStatus === 'loading'}><Workflow size={16} /> Task</button>
            <button onClick={createArtifactFromSession} disabled={syncStatus === 'loading'}><Archive size={16} /> Artifact v{Math.max(0, ...sessionArtifacts.map((artifact) => artifact.version)) + 1}</button>
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
            <button onClick={sendMessage} disabled={isStreaming || syncStatus === 'loading'}><Send size={18} /> {isStreaming ? 'Streaming' : 'Send'}</button>
          </div>
        </section>

        <aside className="context-panel card-panel">
          <div className="panel-title"><PanelRight size={18} /> Context Panel</div>

          <section>
            <h2><Archive size={16} /> Artifacts</h2>
            <button className="ghost" onClick={createArtifactFromSession} disabled={syncStatus === 'loading'}><Plus size={14} /> Save artifact v{Math.max(0, ...sessionArtifacts.map((artifact) => artifact.version)) + 1}</button>
            {sessionArtifacts.map((artifact) => <article className="mini-card" key={artifact.id}><FileText size={15} /><b>{artifact.title}</b><small>{artifact.kind} · v{artifact.version}</small><p>{artifact.content}</p></article>)}
          </section>

          <section>
            <h2><Brain size={16} /> Memories</h2>
            <button className="ghost" onClick={addMemoryFromSession} disabled={syncStatus === 'loading'}><Plus size={14} /> Save current session</button>
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
        <Rocket size={16} /> {APP_VERSION}: Artifact 版本化已接入；Next: real AI Gateway SSE and provider adapter.
      </footer>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
