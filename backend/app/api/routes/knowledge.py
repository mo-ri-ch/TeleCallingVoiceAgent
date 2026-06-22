from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.api.routes.companies import _companies
from app.models.knowledge import (
    KnowledgeChunk,
    KnowledgeChunkCreate,
    KnowledgeChunkSource,
    KnowledgeChunkUpdate,
    KnowledgeSearchRequest,
    KnowledgeSearchResult,
)
from app.services.vector_store import add_chunk, delete_chunk, get_chunks, search, update_chunk

router = APIRouter(prefix="/companies/{company_id}/knowledge", tags=["knowledge"])


def _ensure_company_exists(company_id: str) -> None:
    if company_id not in _companies:
        raise HTTPException(status_code=404, detail="Company not found")


@router.get("", response_model=list[KnowledgeChunk])
def list_knowledge_chunks(company_id: str) -> list[KnowledgeChunk]:
    _ensure_company_exists(company_id)
    return get_chunks(company_id)


@router.post("", response_model=KnowledgeChunk, status_code=201)
def create_knowledge_chunk(
    company_id: str, payload: KnowledgeChunkCreate
) -> KnowledgeChunk:
    _ensure_company_exists(company_id)

    chunk = KnowledgeChunk(
        id=str(uuid4()),
        company_id=company_id,
        source_url="",
        source_title=payload.source_title,
        text=payload.text,
        char_count=len(payload.text),
        tags=payload.tags,
        source_type=KnowledgeChunkSource.manual,
    )
    add_chunk(company_id, chunk)
    return chunk


@router.put("/{chunk_id}", response_model=KnowledgeChunk)
def update_knowledge_chunk(
    company_id: str, chunk_id: str, payload: KnowledgeChunkUpdate
) -> KnowledgeChunk:
    _ensure_company_exists(company_id)

    updates = payload.model_dump(exclude_unset=True)
    if "text" in updates:
        updates["char_count"] = len(updates["text"])

    chunk = update_chunk(company_id, chunk_id, updates)
    if chunk is None:
        raise HTTPException(status_code=404, detail="Chunk not found")
    return chunk


@router.delete("/{chunk_id}", status_code=204)
def delete_knowledge_chunk(company_id: str, chunk_id: str) -> None:
    _ensure_company_exists(company_id)

    if not delete_chunk(company_id, chunk_id):
        raise HTTPException(status_code=404, detail="Chunk not found")


@router.post("/search", response_model=list[KnowledgeSearchResult])
def search_knowledge_chunks(
    company_id: str, payload: KnowledgeSearchRequest
) -> list[KnowledgeSearchResult]:
    _ensure_company_exists(company_id)
    return search(company_id, payload.query, payload.top_k)
