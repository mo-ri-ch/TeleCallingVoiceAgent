from enum import Enum

from pydantic import BaseModel, Field


class KnowledgeChunkSource(str, Enum):
    crawled = "crawled"
    manual = "manual"


class KnowledgeChunk(BaseModel):
    id: str
    company_id: str
    source_url: str
    source_title: str
    text: str
    char_count: int
    tags: list[str] = Field(default_factory=list)
    source_type: KnowledgeChunkSource = KnowledgeChunkSource.crawled


class KnowledgeChunkCreate(BaseModel):
    text: str
    source_title: str = "Manual Entry"
    tags: list[str] = Field(default_factory=list)


class KnowledgeChunkUpdate(BaseModel):
    text: str | None = None
    source_title: str | None = None
    tags: list[str] | None = None


class KnowledgeSearchRequest(BaseModel):
    query: str
    top_k: int = Field(default=5, ge=1, le=20)


class KnowledgeSearchResult(BaseModel):
    chunk: KnowledgeChunk
    score: float
