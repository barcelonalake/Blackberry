# AI Workspace OS v0.1 PRD

## 定位
Blackberry 是手機優先的 AI-native workspace。第一階段用 PWA 快速驗證核心閉環，後續可演進到 SwiftUI 原生端。

## 核心用戶
- 手機作為主要控制台的個人開發者
- 希望用 AI agent 管理專案、產出 artifact、沉澱 memory 與 task 的使用者

## 核心流程
登入 / 進入 workspace → 選 channel → 建 session → 發訊息 → AI 產生回覆 → 轉 artifact / memory / task → task 回到 session 執行。

## v0.1 Scope
- Workspace / Channel / Session 資訊架構
- Chat thread 與 composer
- Artifact / Memory / Task Board 基礎面板
- Supabase schema draft
- FastAPI AI Gateway skeleton

## 非目標
- 完整多人社交系統
- Agent marketplace
- 複雜 RAG / plugin system
- Billing / enterprise admin

## 驗收標準
手機瀏覽器可打開 PWA，看到 workspace shell，能建立 session 概念、查看 artifact / memory / task board 的 MVP 狀態。
