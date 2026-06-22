"""Text embedding utilities.

This module provides a local, dependency-free embedding function based on the
hashing trick (feature-hashed bag-of-words, log-scaled and L2-normalized).
It requires no API keys or model downloads, which keeps the RAG pipeline
fully runnable out of the box.

To upgrade to higher-quality embeddings later (e.g. OpenAI's
`text-embedding-3-small` or Voyage AI), swap the implementation of
`embed_text` while keeping the same signature -- `vector_store` and the API
routes only depend on `embed_text` and `cosine_similarity`.
"""

import hashlib
import math
import re

EMBEDDING_DIM = 512

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


def embed_text(text: str) -> list[float]:
    """Return a fixed-size, L2-normalized embedding for the given text."""
    vector = [0.0] * EMBEDDING_DIM

    for token in _tokenize(text):
        digest = hashlib.md5(token.encode("utf-8")).hexdigest()
        index = int(digest, 16) % EMBEDDING_DIM
        vector[index] += 1.0

    vector = [math.log1p(value) for value in vector]

    norm = math.sqrt(sum(value * value for value in vector))
    if norm > 0:
        vector = [value / norm for value in vector]

    return vector


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Dot product of two L2-normalized vectors equals cosine similarity."""
    return sum(x * y for x, y in zip(a, b))
