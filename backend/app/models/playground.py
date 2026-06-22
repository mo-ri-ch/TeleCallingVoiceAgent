from enum import Enum

from pydantic import BaseModel, Field

from app.models.knowledge import KnowledgeSearchResult


class PlaygroundRole(str, Enum):
    user = "user"
    assistant = "assistant"


class PlaygroundMessage(BaseModel):
    role: PlaygroundRole
    content: str


class PlaygroundChatRequest(BaseModel):
    messages: list[PlaygroundMessage]


class PlaygroundChatResponse(BaseModel):
    reply: PlaygroundMessage
    used_chunks: list[KnowledgeSearchResult] = Field(default_factory=list)


class PlaygroundVoiceChatResponse(BaseModel):
    transcript: str
    reply: PlaygroundMessage
    audio_base64: str
    used_chunks: list[KnowledgeSearchResult] = Field(default_factory=list)
