import React from 'react';
import ReactDOM from 'react-dom/client';
import { GitBranch, Smartphone, Bot, Rocket, CheckCircle2, Link as LinkIcon } from 'lucide-react';
import './styles.css';

const cards = [
  { icon: Smartphone, title: '手機主控', text: '用 Discord / GitHub / 瀏覽器在手機上發需求、看預覽、做驗收。' },
  { icon: Bot, title: 'Agent 開發', text: 'VPS 上由 Hermes、Claude Code、Codex 執行開發、測試、提交。' },
  { icon: GitBranch, title: 'GitHub 中心', text: 'Blackberry repo 保存產品代碼、版本、分支與後續 Pages 部署。' },
  { icon: Rocket, title: 'PWA 交付', text: '先交付可安裝到手機桌面的 Web App，之後再包成原生 App。' },
];

const links = [
  { label: 'GitHub Repo', href: 'https://github.com/barcelonalake/Blackberry' },
  { label: 'HTML Artifacts', href: 'https://barcelonalake.github.io/hosthtml/' },
];

function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <div className="eyebrow">Blackberry · Mobile-first PWA Lab</div>
        <h1>手機就是主開發入口。</h1>
        <p>這是 Blackberry 的第一版 PWA 骨架：手機下需求，服務器開發，GitHub 管理，網頁作為第一交付產品。</p>
        <div className="actions">
          {links.map((link) => (
            <a href={link.href} key={link.href} target="_blank" rel="noreferrer">
              <LinkIcon size={16} />{link.label}
            </a>
          ))}
        </div>
      </section>

      <section className="grid">
        {cards.map(({ icon: Icon, title, text }) => (
          <article className="card" key={title}>
            <div className="icon"><Icon size={22} /></div>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="panel">
        <h2>下一步 MVP</h2>
        <ul>
          {['任務收件箱：手機快速記錄需求', '項目看板：追蹤 GitHub repo / branch / preview', '預覽收藏：保存 Pages / HTML artifact 連結', '開發日誌：記錄每次 agent 改動與驗收狀態'].map((item) => (
            <li key={item}><CheckCircle2 size={18} />{item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
