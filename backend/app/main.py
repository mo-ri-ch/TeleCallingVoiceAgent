import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import call_logs, campaigns, companies, exotel, knowledge, learning, playground, rl_engine, sync, telephony
from app.api.routes.companies import _companies, _run_crawl
from app.models.company import CrawlStatus
from app.services.campaign_dialer import dialer_loop

STATIC_DIR = Path(__file__).resolve().parent / "static"

# Re-crawl + diff-sync every previously-crawled company on this interval,
# mimicking Phase 10's 15-minute sitemap poll. "Sync Now" triggers the same
# diff engine on demand without waiting for this loop.
AUTO_SYNC_INTERVAL_SECONDS = 15 * 60


async def _auto_sync_loop() -> None:
    while True:
        await asyncio.sleep(AUTO_SYNC_INTERVAL_SECONDS)
        for company_id, company in list(_companies.items()):
            if company.crawl_status in (CrawlStatus.completed, CrawlStatus.failed):
                await _run_crawl(company_id)


@asynccontextmanager
async def lifespan(app: FastAPI):
    sync_task = asyncio.create_task(_auto_sync_loop())
    dialer_task = asyncio.create_task(dialer_loop())
    try:
        yield
    finally:
        sync_task.cancel()
        dialer_task.cancel()


app = FastAPI(title="AI Telecaller Voice Agent API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    # "*" lets the embeddable widget (Phase 8) call the API from any host
    # site it's dropped into, in addition to the admin dashboard.
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(call_logs.router, prefix="/api/v1")
app.include_router(campaigns.router, prefix="/api/v1")
app.include_router(learning.router, prefix="/api/v1")
app.include_router(companies.router, prefix="/api/v1")
app.include_router(knowledge.router, prefix="/api/v1")
app.include_router(playground.router, prefix="/api/v1")
app.include_router(rl_engine.router, prefix="/api/v1")
app.include_router(sync.router, prefix="/api/v1")
app.include_router(telephony.router, prefix="/api/v1")
app.include_router(exotel.router, prefix="/api/v1")

# Local mock website (Phase 10) for demonstrating the diff-based sync engine:
# edit a page under app/static/mock_site/, then click "Sync Now".
app.mount(
    "/mock-site",
    StaticFiles(directory=STATIC_DIR / "mock_site", html=True),
    name="mock-site",
)

# Call recordings (Phase 15), saved locally when AWS S3 isn't configured.
RECORDINGS_DIR = STATIC_DIR / "recordings"
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/recordings", StaticFiles(directory=RECORDINGS_DIR), name="recordings")

# Human-uploaded learning studio recordings (Phase 16).
LEARNING_UPLOADS_DIR = STATIC_DIR / "learning_uploads"
LEARNING_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/learning-uploads", StaticFiles(directory=LEARNING_UPLOADS_DIR), name="learning-uploads")

# Exotel TTS audio files served back to Exotel's <Play> verb.
EXOTEL_TTS_DIR = STATIC_DIR / "exotel_tts"
EXOTEL_TTS_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
