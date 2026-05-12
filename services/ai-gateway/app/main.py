from collections.abc import AsyncIterator
import asyncio
from fastapi import FastAPI
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

app = FastAPI(title="AI Workspace Gateway", version="0.1.0")

class ModelInfo(BaseModel):
    id: str
    provider: str
    label: str

class ChatMessage(BaseModel):
    role: str
    content: str

class SessionMessageRequest(BaseModel):
    messages: list[ChatMessage]
    stream: bool = True

class SessionMessageResponse(BaseModel):
    session_id: str
    role: str = "assistant"
    content: str
    model: str = "mock-gateway"

@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-gateway"}

@app.get("/v1/models", response_model=list[ModelInfo])
def models():
    return [
        ModelInfo(id="openai-compatible/default", provider="openai-compatible", label="Default OpenAI-compatible model"),
        ModelInfo(id="hermes/default", provider="hermes", label="Hermes local/default model"),
        ModelInfo(id="mock-gateway", provider="mock", label="Development mock stream"),
    ]

@app.post("/v1/sessions/{session_id}/messages", response_model=SessionMessageResponse)
async def create_session_message(session_id: str, request: SessionMessageRequest):
    latest = request.messages[-1].content if request.messages else ""
    content = f"Mock Gateway 已收到 session {session_id} 的訊息：{latest}。下一步接 provider adapter 與 Supabase message persistence。"
    return SessionMessageResponse(session_id=session_id, content=content)

@app.get("/v1/sessions/{session_id}/messages/stream")
async def stream_session_message(session_id: str, prompt: str = ""):
    async def events() -> AsyncIterator[dict[str, str]]:
        text = f"Mock SSE stream for {session_id}: {prompt or 'ready'}"
        for token in text:
            await asyncio.sleep(0.02)
            yield {"event": "token", "data": token}
        yield {"event": "done", "data": ""}

    return EventSourceResponse(events())
