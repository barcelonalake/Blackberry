from abc import ABC, abstractmethod
from pydantic import BaseModel

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    model: str
    messages: list[ChatMessage]
    stream: bool = False

class ChatResponse(BaseModel):
    content: str
    model: str

class BaseProvider(ABC):
    @abstractmethod
    async def list_models(self) -> list[str]: ...

    @abstractmethod
    async def chat(self, request: ChatRequest) -> ChatResponse: ...
