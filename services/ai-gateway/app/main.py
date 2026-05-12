from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="AI Workspace Gateway", version="0.1.0")

class ModelInfo(BaseModel):
    id: str
    provider: str
    label: str

@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-gateway"}

@app.get("/v1/models", response_model=list[ModelInfo])
def models():
    return [
        ModelInfo(id="openai-compatible/default", provider="openai-compatible", label="Default OpenAI-compatible model"),
        ModelInfo(id="hermes/default", provider="hermes", label="Hermes local/default model"),
    ]
