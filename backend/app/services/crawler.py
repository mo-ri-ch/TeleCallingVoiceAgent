from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from app.models.company import CrawledPage

REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}
MAX_PAGES = 5
REQUEST_TIMEOUT = 10.0


def _normalize_base_url(url: str) -> str:
    if not url.startswith(("http://", "https://")):
        return f"https://{url}"
    return url


async def crawl_site(base_url: str, max_pages: int = MAX_PAGES) -> list[CrawledPage]:
    """Breadth-first crawl of same-domain pages starting at base_url.

    For each reachable HTML page, extracts the title, meta description,
    and the length of the cleaned visible text.
    """
    base_url = _normalize_base_url(base_url)
    domain = urlparse(base_url).netloc

    visited: set[str] = set()
    queue: list[str] = [base_url]
    pages: list[CrawledPage] = []

    async with httpx.AsyncClient(
        headers=REQUEST_HEADERS,
        timeout=REQUEST_TIMEOUT,
        follow_redirects=True,
    ) as client:
        while queue and len(pages) < max_pages:
            url = queue.pop(0)
            if url in visited:
                continue
            visited.add(url)

            try:
                response = await client.get(url)
                response.raise_for_status()
            except httpx.HTTPError:
                continue

            content_type = response.headers.get("content-type", "")
            if "text/html" not in content_type:
                continue

            soup = BeautifulSoup(response.text, "html.parser")

            title_tag = soup.find("title")
            title = title_tag.get_text(strip=True) if title_tag else url

            meta_description = ""
            meta_tag = soup.find("meta", attrs={"name": "description"})
            if meta_tag and meta_tag.get("content"):
                meta_description = meta_tag["content"].strip()

            for tag in soup(["script", "style", "noscript"]):
                tag.decompose()

            clean_text = " ".join(soup.get_text(separator=" ").split())

            pages.append(
                CrawledPage(
                    url=url,
                    title=title,
                    meta_description=meta_description,
                    text=clean_text,
                    text_length=len(clean_text),
                )
            )

            if len(pages) >= max_pages:
                break

            for link in soup.find_all("a", href=True):
                joined = urljoin(url, link["href"])
                parsed_url = urlparse(joined)
                if parsed_url.netloc != domain:
                    continue
                clean_link = parsed_url._replace(fragment="").geturl()
                if clean_link not in visited and clean_link not in queue:
                    queue.append(clean_link)

    return pages
