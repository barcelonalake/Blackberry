import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Archive,
  Clipboard,
  Bot,
  Brain,
  CheckCircle2,
  Circle,
  Code2,
  Cpu,
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
import type { AgentRun, Artifact, Memory, Message, Session, Task, WorkspaceState } from './domain/types';
import { createWorkspaceRuntime } from './data/workspaceRepositoryFactory';
import { createAuthRuntime, type AuthBootstrapSession } from './auth/authBootstrap';
import { initialState } from './data/initialState';
import { AIGatewayClient } from './services/aiGatewayClient';
import './styles.css';

const env = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_AI_GATEWAY_URL: import.meta.env.VITE_AI_GATEWAY_URL,
  VITE_AI_PROVIDER: import.meta.env.VITE_AI_PROVIDER,
  VITE_AI_MODEL: import.meta.env.VITE_AI_MODEL,
};

const runtime = createWorkspaceRuntime({
  env,
  storage: window.localStorage,
});
const authRuntime = createAuthRuntime({ env, storage: window.localStorage });
const repository = runtime.repository;
const gateway = new AIGatewayClient();
const providerOptions = ['mock', 'kimi', 'deepseek', 'openai', 'anthropic'] as const;
const modelPresets: Record<string, string> = {
  mock: 'gateway/mock-stream',
  kimi: 'kimi-k2.6:cloud',
  deepseek: 'deepseek-r1:cloud',
  openai: 'gpt-5.5',
  anthropic: 'claude-sonnet-4.5',
};

const APP_VERSION = 'v0.3.1';
const ROADMAP_URL = 'https://barcelonalake.github.io/hosthtml/artifacts/ai-workspace-roadmap.html';
const roadmapVersions = [
  { version: 'v0.1', label: 'HTML Prototype', status: 'done', detail: '資訊架構與三欄視覺已驗證。' },
  { version: 'v0.2', label: 'Web MVP', status: 'done', detail: 'PWA、local persistence、Auth bootstrap、Artifact 編輯與匯出。' },
  { version: 'v0.3', label: 'Multi-model Agent', status: 'active', detail: 'AI Gateway、provider adapter、agent run queue、run-to-artifact。' },
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
  const [artifactDraft, setArtifactDraft] = useState('');
  const [artifactNotice, setArtifactNotice] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(gateway.runtime.provider);
  const [selectedModel, setSelectedModel] = useState(gateway.runtime.model);
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
  const selectedArtifact = sessionArtifacts[0];

  const metrics = useMemo(() => [
    { label: 'Channels', value: state.channels.length, icon: Hash },
    { label: 'Sessions', value: state.sessions.length, icon: MessageSquare },
    { label: 'Artifacts', value: state.artifacts.length, icon: Archive },
    { label: 'Agent Runs', value: state.agentRuns.length, icon: Cpu },
  ], [state]);

  function setProvider(nextProvider: string) {
    setSelectedProvider(nextProvider);
    setSelectedModel(modelPresets[nextProvider] ?? selectedModel);
  }

  function updateAgentRun(runId: string, patch: Partial<AgentRun>) {
    const current = stateRef.current;
    const nextRuns = current.agentRuns.map((run) => (run.id === runId ? { ...run, ...patch } : run));
    const next = { ...current, agentRuns: nextRuns };
    stateRef.current = next;
    setState(next);
    Promise.resolve(repository.save(next)).catch((error: unknown) => {
      setSyncStatus('error');
      setSyncError(String(error));
    });
  }

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
      model: `${selectedProvider}/${selectedModel}`,
      summary: `新建立的 AI 工作單元；目前使用 ${selectedProvider} provider。`,
    };
    persist({ ...state, sessions: [nextSession, ...state.sessions] });
    setActiveSessionId(id);
  }

  async function sendMessage() {
    if (!draft.trim() || !activeSession || isStreaming || syncStatus === 'loading') return;
    const time = nowLabel();
    const prompt = draft.trim();
    const userMessage: Message = { id: `m${Date.now()}`, sessionId: activeSession.id, role: 'user', content: prompt, time };
    const assistantId = `m${Date.now() + 1}`;
    const runId = `run${Date.now() + 2}`;
    const assistantMessage: Message = { id: assistantId, sessionId: activeSession.id, role: 'assistant', content: '', time };
    const agentRun: AgentRun = {
      id: runId,
      sessionId: activeSession.id,
      provider: selectedProvider,
      model: selectedModel,
      status: 'running',
      input: prompt,
      output: '',
      startedAt: time,
    };
    const seed = { ...state, messages: [...state.messages, userMessage, assistantMessage], agentRuns: [agentRun, ...state.agentRuns] };
    await persist(seed);
    setDraft('');
    setIsStreaming(true);

    try {
      for await (const chunk of gateway.streamSessionMessage({ sessionId: activeSession.id, messages: [...messages, userMessage], provider: selectedProvider, model: selectedModel, runId })) {
        if (chunk.done) break;
        const current = stateRef.current;
        const nextMessages = current.messages.map((message) =>
          message.id === assistantId ? { ...message, content: message.content + chunk.delta } : message,
        );
        const nextRuns = current.agentRuns.map((run) =>
          run.id === runId ? { ...run, output: run.output + chunk.delta } : run,
        );
        await persist({ ...current, messages: nextMessages, agentRuns: nextRuns });
      }
      updateAgentRun(runId, { status: 'completed', completedAt: nowLabel() });
    } catch (error) {
      const current = stateRef.current;
      const errorText = `AI Gateway error: ${String(error)}`;
      const nextMessages = current.messages.map((message) =>
        message.id === assistantId ? { ...message, content: errorText } : message,
      );
      const nextRuns = current.agentRuns.map((run) =>
        run.id === runId ? { ...run, status: 'failed' as const, output: errorText, completedAt: nowLabel() } : run,
      );
      await persist({ ...current, messages: nextMessages, agentRuns: nextRuns });
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
    setArtifactDraft(content);
    setArtifactNotice(`Artifact v${nextVersion} saved`);
    persist({ ...state, artifacts: [nextArtifact, ...state.artifacts] });
  }

  function saveAgentRunAsArtifact(run: AgentRun) {
    const session = state.sessions.find((item) => item.id === run.sessionId) ?? activeSession;
    if (!session) return;
    const artifactsForRunSession = state.artifacts.filter((artifact) => artifact.sessionId === run.sessionId);
    const nextVersion = Math.max(0, ...artifactsForRunSession.map((artifact) => artifact.version)) + 1;
    const content = run.output.trim() || run.input.trim();
    const nextArtifact: Artifact = {
      id: `a${Date.now()}`,
      sessionId: run.sessionId,
      title: `${session.title} · ${run.provider}/${run.model} run artifact`,
      kind: 'markdown',
      version: nextVersion,
      content: `# Agent Run Artifact\n\n- Provider: ${run.provider}\n- Model: ${run.model}\n- Status: ${run.status}\n- Started: ${run.startedAt}${run.completedAt ? `\n- Completed: ${run.completedAt}` : ''}\n\n## Input\n${run.input}\n\n## Output\n${content}`,
    };
    setArtifactDraft(nextArtifact.content);
    setArtifactNotice(`Agent run saved as Artifact v${nextVersion}`);
    persist({ ...state, artifacts: [nextArtifact, ...state.artifacts] });
  }

  function retryAgentRun(run: AgentRun) {
    if (isStreaming || syncStatus === 'loading') return;
    setActiveSessionId(run.sessionId);
    setSelectedProvider(run.provider);
    setSelectedModel(run.model);
    setDraft(run.input);
  }

  function updateSelectedArtifactContent() {
    if (!selectedArtifact) return;
    const nextArtifacts = state.artifacts.map((artifact) =>
      artifact.id === selectedArtifact.id ? { ...artifact, content: artifactDraft } : artifact,
    );
    setArtifactNotice(`Artifact v${selectedArtifact.version} updated`);
    persist({ ...state, artifacts: nextArtifacts });
  }

  async function copySelectedArtifact() {
    if (!selectedArtifact) return;
    try {
      await navigator.clipboard.writeText(selectedArtifact.content);
      setArtifactNotice(`Artifact v${selectedArtifact.version} copied`);
    } catch {
      setArtifactNotice('Copy unavailable in this browser');
    }
  }

  function downloadSelectedArtifact() {
    if (!selectedArtifact) return;
    const blob = new Blob([selectedArtifact.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedArtifact.title.replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '-').slice(0, 60)}-v${selectedArtifact.version}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setArtifactNotice(`Artifact v${selectedArtifact.version} exported`);
  }

  useEffect(() => {
    setArtifactDraft(selectedArtifact?.content ?? '');
    setArtifactNotice('');
  }, [selectedArtifact?.id]);

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
            <p>參考 roadmap：目前標注為 <b>{APP_VERSION}</b>，持續推進 v0.3 Multi-model Agent；本版加入 Agent Run 一鍵轉 Artifact 與 retry loop。</p>
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

      <section className="agent-runtime-card">
        <div>
          <div className="panel-title"><Cpu size={18} /> Agent Runtime</div>
          <p>{gateway.runtime.mode === 'sse' ? 'SSE gateway connected' : 'Local mock stream；v0.3.1 支援 run → artifact 與 retry。'}</p>
          <small>{gateway.runtime.endpointLabel}</small>
        </div>
        <label>
          Provider
          <select value={selectedProvider} onChange={(event) => setProvider(event.target.value)}>
            {providerOptions.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
          </select>
        </label>
        <label>
          Model
          <input value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} />
        </label>
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
            {selectedArtifact && (
              <div className="artifact-workbench">
                <div className="artifact-toolbar">
                  <span>Editing v{selectedArtifact.version}</span>
                  <button onClick={updateSelectedArtifactContent} disabled={syncStatus === 'loading'}><FileText size={14} /> Update</button>
                  <button onClick={copySelectedArtifact}><Clipboard size={14} /> Copy</button>
                  <button onClick={downloadSelectedArtifact}><Archive size={14} /> Export .md</button>
                </div>
                <textarea value={artifactDraft} onChange={(event) => setArtifactDraft(event.target.value)} aria-label="Artifact editor" />
                <p className="artifact-preview">{artifactDraft}</p>
                {artifactNotice && <small className="artifact-notice">{artifactNotice}</small>}
              </div>
            )}
            {sessionArtifacts.map((artifact) => <article className="mini-card" key={artifact.id}><FileText size={15} /><b>{artifact.title}</b><small>{artifact.kind} · v{artifact.version}</small><p>{artifact.content}</p></article>)}
          </section>

          <section>
            <h2><Brain size={16} /> Memories</h2>
            <button className="ghost" onClick={addMemoryFromSession} disabled={syncStatus === 'loading'}><Plus size={14} /> Save current session</button>
            {state.memories.map((memory) => <article className="mini-card" key={memory.id}><Circle size={12} className={memory.active ? 'green' : ''} /><b>{memory.title}</b><p>{memory.content}</p></article>)}
          </section>

          <section>
            <h2><Cpu size={16} /> Agent Runs</h2>
            {state.agentRuns.filter((run) => run.sessionId === activeSession?.id).map((run) => (
              <article className={`agent-run ${run.status}`} key={run.id}>
                <b>{run.provider}/{run.model}</b>
                <small>{run.status} · {run.startedAt}{run.completedAt ? ` → ${run.completedAt}` : ''}</small>
                <p>{run.output || run.input}</p>
                <div className="agent-run-actions">
                  <button onClick={() => saveAgentRunAsArtifact(run)} disabled={syncStatus === 'loading'}><Archive size={13} /> Save artifact</button>
                  <button onClick={() => retryAgentRun(run)} disabled={isStreaming || syncStatus === 'loading'}><RefreshCcw size={13} /> Retry</button>
                </div>
              </article>
            ))}
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
        <Rocket size={16} /> {APP_VERSION}: Agent Runs 可一鍵保存為 Artifact 並支援 retry；Next: backend-hosted AI Gateway contract.
      </footer>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);



