# Data Model

## Workspace
最高層工作區：members、channels、sessions、memories、artifacts、tasks、integrations、model settings。

## Channel
長期分類容器，類似 Discord channel / Zulip stream。

## Session
真正的 AI 工作單元，可是 chat、research、coding agent、design 討論或 artifact 生成流程。

## Message
session 內訊息：user、assistant、system、tool_result、agent_event、artifact_event、memory_event、task_event。

## Artifact
AI 生成或人類上傳的成果物：HTML、Markdown、Code、Diagram、Image、PDF、CSV、JSON、Prompt template。

## Memory
跨 session 可引用知識。v0.1 先手動保存 / AI 建議，v0.2 再做 embedding。

## Task
Todo / In Progress / Blocked / Done；可連回 session、artifact、agent_run。

## AgentRun
Agent 執行紀錄：input、output、status、error、linked task/session。
