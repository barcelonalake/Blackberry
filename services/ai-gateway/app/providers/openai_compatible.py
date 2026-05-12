import httpx
from .base import BaseProvider, ChatRequest, ChatResponse

class OpenAICompatibleProvider(BaseProvider):
    def __init__(self, base_url: str, api_key: str | None = None):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    async def list_models(self) -> list[str]:
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(f"{self.base_url}/models", headers=headers)
            response.raise_for_status()
            data = response.json()
        return [item["id"] for item in data.get("data", [])]

    async def chat(self, request: ChatRequest) -> ChatResponse:
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        payload = request.model_dump()
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(f"{self.base_url}/chat/completions", json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
        content = data["choices"][0]["message"]["content"]
        return ChatResponse(content=content, model=request.model)
