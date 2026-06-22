"""In-memory per-company vector store.

Stores knowledge chunks alongside their embeddings and supports cosine
similarity search. This stands in for a pgvector/Pinecone-backed store for
local development -- swap this module for a real vector database once one is
provisioned, keeping the same `get_chunks` / `add_chunk` / `update_chunk` /
`delete_chunk` / `search` interface.
"""

from app.models.knowledge import KnowledgeChunk, KnowledgeSearchResult
from app.services.embeddings import cosine_similarity, embed_text

_chunks: dict[str, dict[str, KnowledgeChunk]] = {}
_embeddings: dict[str, dict[str, list[float]]] = {}


def get_chunks(company_id: str) -> list[KnowledgeChunk]:
    return list(_chunks.get(company_id, {}).values())


def add_chunk(company_id: str, chunk: KnowledgeChunk) -> None:
    _chunks.setdefault(company_id, {})[chunk.id] = chunk
    _embeddings.setdefault(company_id, {})[chunk.id] = embed_text(chunk.text)


def update_chunk(
    company_id: str, chunk_id: str, updates: dict
) -> KnowledgeChunk | None:
    chunks = _chunks.get(company_id, {})
    chunk = chunks.get(chunk_id)
    if chunk is None:
        return None

    updated = chunk.model_copy(update=updates)
    chunks[chunk_id] = updated

    if "text" in updates:
        _embeddings.setdefault(company_id, {})[chunk_id] = embed_text(updated.text)

    return updated


def delete_chunk(company_id: str, chunk_id: str) -> bool:
    chunks = _chunks.get(company_id, {})
    if chunk_id not in chunks:
        return False

    del chunks[chunk_id]
    _embeddings.get(company_id, {}).pop(chunk_id, None)
    return True


def search(company_id: str, query: str, top_k: int = 5) -> list[KnowledgeSearchResult]:
    chunks = _chunks.get(company_id, {})
    embeddings = _embeddings.get(company_id, {})
    if not chunks or not query.strip():
        return []

    query_vector = embed_text(query)
    results = [
        KnowledgeSearchResult(
            chunk=chunk, score=cosine_similarity(query_vector, embeddings[chunk_id])
        )
        for chunk_id, chunk in chunks.items()
    ]
    results.sort(key=lambda result: result.score, reverse=True)
    return results[:top_k]
