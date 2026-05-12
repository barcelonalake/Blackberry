# Architecture

```text
Mobile PWA / Future SwiftUI Client
  ├─ Supabase: Auth / Postgres / Realtime / Storage
  └─ AI Gateway: FastAPI + Provider adapters + SSE
        ├─ OpenAI-compatible
        ├─ Claude
        ├─ DeepSeek
        ├─ Ollama
        └─ Hermes / Tool / Agent adapter
```

本 repo 先以 PWA 實作產品外殼與核心資訊架構，保留 `services/ai-gateway` 與 `supabase/migrations` 作為後端落點。
