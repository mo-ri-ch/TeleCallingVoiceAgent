"""Diff-based auto-sync engine (Phase 10).

After each crawl, this module hashes the clean text of every page and
compares it to the hash recorded during the previous sync. Pages whose hash
is unchanged keep their existing crawled chunks untouched. Pages that are new
or whose hash changed have their crawled chunks removed and re-embedded from
the freshly crawled text -- a surgical update instead of a full re-index.
"""

import hashlib
from datetime import datetime, timezone
from uuid import uuid4

from app.models.company import CrawledPage
from app.models.knowledge import KnowledgeChunk, KnowledgeChunkSource
from app.models.sync import SyncLogEntry
from app.services import vector_store
from app.services.chunker import chunk_text

# company_id -> {page_url: hash of that page's clean text at last sync}.
_page_hashes: dict[str, dict[str, str]] = {}

# company_id -> sync log entries, newest first.
_sync_logs: dict[str, list[SyncLogEntry]] = {}

MAX_SYNC_LOGS_PER_COMPANY = 20


def _hash_page_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:12]


def _pluralize(count: int, noun: str) -> str:
    return f"{count} {noun}" if count == 1 else f"{count} {noun}s"


def _build_summary(pages_changed: int, chunks_reindexed: int, chunks_untouched: int) -> str:
    return (
        f"{_pluralize(pages_changed, 'page')} changed, "
        f"{_pluralize(chunks_reindexed, 'chunk')} re-indexed, "
        f"{_pluralize(chunks_untouched, 'chunk')} untouched"
    )


def sync_company_pages(company_id: str, pages: list[CrawledPage]) -> SyncLogEntry:
    """Diff freshly crawled pages against stored hashes and surgically update
    only the crawled chunks belonging to pages whose content changed."""
    stored_hashes = _page_hashes.setdefault(company_id, {})

    pages_changed = 0
    chunks_reindexed = 0
    chunks_untouched = 0

    for page in pages:
        new_hash = _hash_page_text(page.text)
        existing_chunks = [
            chunk
            for chunk in vector_store.get_chunks(company_id)
            if chunk.source_type == KnowledgeChunkSource.crawled
            and chunk.source_url == page.url
        ]

        if stored_hashes.get(page.url) == new_hash:
            chunks_untouched += len(existing_chunks)
            continue

        pages_changed += 1
        stored_hashes[page.url] = new_hash

        for chunk in existing_chunks:
            vector_store.delete_chunk(company_id, chunk.id)

        for text in chunk_text(page.text):
            vector_store.add_chunk(
                company_id,
                KnowledgeChunk(
                    id=str(uuid4()),
                    company_id=company_id,
                    source_url=page.url,
                    source_title=page.title,
                    text=text,
                    char_count=len(text),
                    source_type=KnowledgeChunkSource.crawled,
                ),
            )
            chunks_reindexed += 1

    entry = SyncLogEntry(
        id=str(uuid4()),
        company_id=company_id,
        triggered_at=datetime.now(timezone.utc),
        pages_checked=len(pages),
        pages_changed=pages_changed,
        chunks_reindexed=chunks_reindexed,
        chunks_untouched=chunks_untouched,
        summary=_build_summary(pages_changed, chunks_reindexed, chunks_untouched),
    )

    logs = _sync_logs.setdefault(company_id, [])
    logs.insert(0, entry)
    del logs[MAX_SYNC_LOGS_PER_COMPANY:]

    return entry


def get_sync_logs(company_id: str) -> list[SyncLogEntry]:
    return _sync_logs.get(company_id, [])
