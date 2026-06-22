from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ToneOfVoice(str, Enum):
    friendly = "friendly"
    professional = "professional"
    formal = "formal"


class PrimaryLanguage(str, Enum):
    malayalam = "malayalam"
    hindi = "hindi"
    english = "english"
    tamil = "tamil"
    kannada = "kannada"


class CrawlStatus(str, Enum):
    not_started = "not_started"
    queued = "queued"
    crawling = "crawling"
    completed = "completed"
    failed = "failed"


class CompanyProfileBase(BaseModel):
    name: str
    website_url: str
    agent_name: str
    tone: ToneOfVoice
    primary_language: PrimaryLanguage
    escalation_numbers: list[str] = Field(default_factory=list)
    inbound_phone_number: str = ""


class CompanyProfileCreate(CompanyProfileBase):
    pass


class CrawledPage(BaseModel):
    url: str
    title: str
    meta_description: str = ""
    text: str = Field(default="", exclude=True)
    text_length: int


class CompanyProfile(CompanyProfileBase):
    id: str
    crawl_status: CrawlStatus = CrawlStatus.not_started
    pages_indexed: int = 0
    crawled_pages: list[CrawledPage] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
