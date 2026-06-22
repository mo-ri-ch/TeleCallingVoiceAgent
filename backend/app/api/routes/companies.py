from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.models.company import (
    CompanyProfile,
    CompanyProfileCreate,
    CrawlStatus,
    PrimaryLanguage,
    ToneOfVoice,
)
from app.services.crawler import crawl_site
from app.services.sync_engine import sync_company_pages

router = APIRouter(prefix="/companies", tags=["companies"])

_companies: dict[str, CompanyProfile] = {}


def _seed() -> None:
    now = datetime(2026, 6, 1, 9, 0, 0, tzinfo=timezone.utc)

    seed_companies = [
        CompanyProfile(
            id="bridgeon-skillversity",
            name="Bridgeon Skillversity",
            website_url="https://bridgeon.in",
            agent_name="Priya",
            tone=ToneOfVoice.friendly,
            primary_language=PrimaryLanguage.malayalam,
            inbound_phone_number="09513886363",
            escalation_numbers=["+91 98470 12345"],
            crawl_status=CrawlStatus.not_started,
            pages_indexed=0,
            created_at=now,
            updated_at=now,
        ),
        CompanyProfile(
            id="northstar-finance-academy",
            name="Northstar Finance Academy",
            # A local mock site (Phase 10) so "Sync Now" can be demonstrated
            # by editing backend/app/static/mock_site/*.html and re-syncing.
            website_url="http://localhost:8000/mock-site/index.html",
            agent_name="Arjun",
            tone=ToneOfVoice.professional,
            primary_language=PrimaryLanguage.english,
            escalation_numbers=["+91 90000 11111"],
            crawl_status=CrawlStatus.not_started,
            pages_indexed=0,
            created_at=now,
            updated_at=now,
        ),
        CompanyProfile(
            id="greenfield-dental-clinic",
            name="Greenfield Dental Clinic",
            website_url="https://greenfielddental.example.com",
            agent_name="Meera",
            tone=ToneOfVoice.formal,
            primary_language=PrimaryLanguage.hindi,
            escalation_numbers=["+91 98765 43210", "+91 91234 56789"],
            crawl_status=CrawlStatus.crawling,
            pages_indexed=4,
            created_at=now,
            updated_at=now,
        ),
    ]

    for company in seed_companies:
        _companies[company.id] = company


_seed()


@router.get("", response_model=list[CompanyProfile])
def list_companies() -> list[CompanyProfile]:
    return list(_companies.values())


@router.post("", response_model=CompanyProfile, status_code=201)
def create_company(payload: CompanyProfileCreate) -> CompanyProfile:
    now = datetime.now(timezone.utc)
    company = CompanyProfile(
        id=str(uuid4()),
        created_at=now,
        updated_at=now,
        **payload.model_dump(),
    )
    _companies[company.id] = company
    return company


@router.get("/{company_id}", response_model=CompanyProfile)
def get_company(company_id: str) -> CompanyProfile:
    company = _companies.get(company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


async def _run_crawl(company_id: str) -> None:
    company = _companies.get(company_id)
    if company is None:
        return

    company.crawl_status = CrawlStatus.crawling
    company.updated_at = datetime.now(timezone.utc)

    try:
        pages = await crawl_site(company.website_url)
    except Exception:
        company.crawl_status = CrawlStatus.failed
    else:
        company.crawled_pages = pages
        company.pages_indexed = len(pages)
        company.crawl_status = CrawlStatus.completed if pages else CrawlStatus.failed
        sync_company_pages(company_id, pages)
    finally:
        company.updated_at = datetime.now(timezone.utc)


@router.post("/{company_id}/crawl", response_model=CompanyProfile)
def trigger_crawl(company_id: str, background_tasks: BackgroundTasks) -> CompanyProfile:
    company = _companies.get(company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")

    company.crawl_status = CrawlStatus.queued
    company.updated_at = datetime.now(timezone.utc)
    background_tasks.add_task(_run_crawl, company_id)
    return company
