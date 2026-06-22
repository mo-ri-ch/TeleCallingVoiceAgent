# Product Requirements Document (PRD)
## AI Telecaller Voice Agent — Multi-Company, Multilingual Sales Bot

**Version:** 1.3  
**Date:** June 2026  
**Prepared for:** Bridgeon Skillversity (bridgeon.in)  
**Document Owner:** Product Team  
**Status:** Ready for Engineering Handoff

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Goals](#2-product-vision--goals)
3. [Stakeholders](#3-stakeholders)
4. [User Personas](#4-user-personas)
5. [System Architecture Overview](#5-system-architecture-overview)
6. [Core Features & Functional Requirements](#6-core-features--functional-requirements)
7. **[Zero-Interference Widget Integration & Autonomous Website Sync](#7-zero-interference-widget-integration--autonomous-website-sync)**
8. **[Human Recording Upload & Conversational Learning Engine](#8-human-recording-upload--conversational-learning-engine)**
9. **[Reinforcement Learning Engine — Autonomous Self-Improvement](#9-reinforcement-learning-engine--autonomous-self-improvement)** ← NEW
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Technology Stack](#11-technology-stack)
12. [API Integrations](#12-api-integrations)
13. [Data Models](#13-data-models)
14. [Admin Dashboard Requirements](#14-admin-dashboard-requirements)
15. [Web Widget (Pop-up Voice Bot)](#15-web-widget-pop-up-voice-bot)
16. [Call Flows & Conversation Design](#16-call-flows--conversation-design)
17. [Excel / CRM Reporting](#17-excel--crm-reporting)
18. [Security & Compliance](#18-security--compliance)
19. [Milestones & Phased Rollout](#19-milestones--phased-rollout)
20. [Open Questions & Assumptions](#20-open-questions--assumptions)
21. [Glossary](#21-glossary)

---

## 1. Executive Summary

This document describes an **AI-powered Telecaller Voice Agent** — a white-label, multi-company voice bot that can pitch products and services on behalf of any company by crawling and ingesting their website content. It supports inbound and outbound calls, multilingual conversations (with first-class support for Malayalam and other Indian languages via Sarvam AI), a floating voice widget for websites, human agent escalation/handoff, and automated post-call reporting to Excel/Google Sheets.

The first deployment client is **Bridgeon Skillversity** (bridgeon.in), Kerala's leading skill-development education ecosystem offering Tech School, Media School, Business School, and Skill-First Degree programs.

---

## 2. Product Vision & Goals

### Vision
Build the most India-friendly AI sales telecaller — one that speaks fluent Malayalam, understands regional accents, converts leads at scale, and never sleeps.

### Primary Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Automate outbound cold calling for sales teams | ≥50% of cold calls handled without human intervention |
| G2 | Enable inbound enquiry handling 24×7 | <3s average response latency |
| G3 | Support seamless multi-language conversations (Malayalam, Hindi, English, Tamil, Kannada) | CSAT ≥ 4/5 in Malayalam calls |
| G4 | Allow any company to onboard by providing their URL | Onboarding time < 30 minutes |
| G5 | Auto-log every call to Excel/Sheets for sales tracking | 100% call records auto-filed |
| G6 | Reduce cost-per-lead for Bridgeon by 60% | MoM lead cost comparison |

---

## 3. Stakeholders

| Role | Name / Team | Responsibility |
|------|-------------|----------------|
| Product Owner | Bridgeon Management | Final approval on features |
| Engineering Lead | Dev Team | Architecture & implementation |
| Sales Team | Bridgeon Telecallers | End users, feedback, escalation receivers |
| Marketing | Bridgeon Marketing | Landing page widget deployment |
| AI/ML Engineer | Dev Team | LLM, STT, TTS, RAG pipeline |
| QA | Dev Team | Test scripts, multilingual QA |
| External Vendor | Sarvam AI | Indian language ASR/TTS APIs |

---

## 4. User Personas

### Persona A — The Prospect (Inbound / Outbound Call Recipient)
- A 12th-pass or graduate student in Kerala/Tamil Nadu looking for career options
- Speaks Malayalam primarily; partial English
- Responds best to conversational, friendly tone in native language
- Needs clear, jargon-free explanation of courses, fees, placement stats

### Persona B — The Admin (Company Operator)
- A Bridgeon admissions or marketing manager
- Needs to configure which URL to scrape, set call campaign targets, review logs
- Non-technical; uses the Admin Dashboard

### Persona C — The Human Telecaller (Escalation Agent)
- Existing Bridgeon telecaller who receives transferred calls
- Needs context summary before the call lands
- Uses a simple agent desktop or mobile app

### Persona D — White-Label Client (Future Companies)
- Any company that wants to deploy this bot for their own sales calls
- Provides their website URL; expects zero-code onboarding
- May need custom language/persona settings

---

## 5. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                           │
│  ┌─────────────────────┐      ┌──────────────────────────────┐  │
│  │  Admin Dashboard    │      │  Web Widget (Floating Bot)   │  │
│  │  (React / Next.js)  │      │  (JS Snippet / iframe)       │  │
│  └─────────┬───────────┘      └──────────┬───────────────────┘  │
└────────────│──────────────────────────────│───────────────────────┘
             │                              │
┌────────────▼──────────────────────────────▼───────────────────────┐
│                        API GATEWAY (Node.js / FastAPI)            │
│  Auth · Rate Limiting · Logging · Multi-tenant Routing            │
└───────────────────────────────────┬───────────────────────────────┘
                                    │
        ┌───────────────────────────▼───────────────────────────┐
        │               CORE AGENT SERVICES                      │
        │                                                         │
        │  ┌───────────┐  ┌───────────┐  ┌──────────────────┐  │
        │  │  RAG /    │  │  LLM      │  │  Call Orchestrator│  │
        │  │  Knowledge│  │  Engine   │  │  (Inbound +      │  │
        │  │  Base     │  │  (Claude/ │  │   Outbound)      │  │
        │  │  (Vector  │  │   GPT-4o) │  │                  │  │
        │  │  DB)      │  │           │  │                  │  │
        │  └─────┬─────┘  └─────┬─────┘  └──────┬───────────┘  │
        └────────│───────────────│────────────────│───────────────┘
                 │               │                │
        ┌────────▼───────────────▼────────────────▼───────────────┐
        │                 INTEGRATION LAYER                        │
        │                                                          │
        │ ┌────────────┐ ┌─────────────┐ ┌───────────────────┐   │
        │ │ Sarvam AI  │ │ Telephony   │ │  Excel / Sheets   │   │
        │ │ STT + TTS  │ │ (Exotel /  │ │  Reporting Module │   │
        │ │ Malayalam+ │ │  Twilio /  │ │                   │   │
        │ │            │ │  Plivo)    │ │                   │   │
        │ └────────────┘ └─────────────┘ └───────────────────┘   │
        │                                                          │
        │ ┌────────────┐ ┌─────────────┐                         │
        │ │ Web Scraper│ │ Human Agent │                         │
        │ │ & Indexer  │ │ Transfer    │                         │
        │ │ (Crawlee / │ │ (SIP / API)│                         │
        │ │  Firecrawl)│ │            │                         │
        │ └────────────┘ └─────────────┘                         │
        └──────────────────────────────────────────────────────────┘
```

---

## 6. Core Features & Functional Requirements

### 6.1 Multi-Company Onboarding (White-Label Core)

**FR-01:** The Admin can create a new "Company Profile" by entering a website URL (e.g., `bridgeon.in`).

**FR-02:** Upon URL submission, the system automatically:
- Crawls all pages of the website using a headless scraper (Firecrawl or Crawlee)
- Chunks and embeds the content into a vector database (Pinecone / Weaviate / pgvector)
- Generates a company-specific knowledge base namespace

**FR-03:** The Admin can define:
- Company name, logo, tone of voice (friendly / professional / formal)
- Primary languages (with Malayalam as default for Indian deployments)
- Agent persona name (e.g., "Priya from Bridgeon")
- Escalation phone number(s) for human handoff

**FR-04:** When another company needs to be served, the Admin simply creates a new Company Profile with a different URL — no code change required.

**FR-05:** The system re-crawls the website on a configurable schedule (daily/weekly) or on-demand to keep the knowledge base updated.

---

### 6.2 Inbound Call Handling

**FR-06:** The system provides a dedicated inbound phone number (via Exotel/Twilio) per Company Profile.

**FR-07:** When a prospect calls:
1. The agent greets in the prospect's preferred language (auto-detected via first 5 seconds of speech, or explicitly asked)
2. Asks how it can help
3. Answers queries using the company's knowledge base (RAG)
4. Pitches relevant products/services conversationally
5. Captures lead details (name, phone, interest, location)
6. Schedules a callback or counseling session if needed
7. Ends the call gracefully or escalates to a human agent

**FR-08:** The agent must handle hold silences of up to 10 seconds without disconnecting.

**FR-09:** A caller can say "transfer me to a human" or "I want to speak to someone" at any point — the agent must acknowledge and initiate warm transfer within 15 seconds.

---

### 6.3 Outbound Cold Calling

**FR-10:** The Admin can upload a CSV of leads (name, phone number, optional language preference, interest tag).

**FR-11:** The system supports campaign creation:
- Campaign name, target company profile, calling window (e.g., 10 AM–6 PM IST)
- Retry logic: maximum 3 attempts per number, spaced at configurable intervals
- Daily call limit per campaign

**FR-12:** When calling outbound:
1. The agent introduces itself and the company in the prospect's language
2. Delivers a short pitch (30–45 seconds) based on the company's key offerings
3. Handles objections using the knowledge base and pre-configured objection-handling scripts
4. Collects interest signals and lead info
5. Offers to connect to a human or schedule a callback

**FR-13:** If the call goes to voicemail, the agent leaves a pre-recorded or dynamically generated voicemail message and logs the attempt.

**FR-14:** The system tracks call status: `not_contacted`, `voicemail`, `answered_interested`, `answered_not_interested`, `busy`, `failed`.

---

### 6.4 Multilingual Support (Sarvam AI Integration)

**FR-15:** Primary language support:
- **Malayalam** (Priority 1 — powered by Sarvam AI `saarika` ASR and `bulbul` TTS)
- Hindi (Priority 2)
- English (Priority 3)
- Tamil (Priority 4)
- Kannada (Priority 5)

**FR-16:** Language auto-detection: The STT engine listens to the first user utterance and detects the language automatically. The agent switches to that language for the remainder of the call.

**FR-17:** Code-switching support: A prospect may mix Malayalam and English ("Manglish"). The system must handle this gracefully without confusion.

**FR-18:** The Malayalam TTS voice must sound natural, use the correct Kerala dialect, and avoid robotic cadence. Use Sarvam AI's `bulbul:v1` or equivalent Malayalam-optimized voice model.

**FR-19:** All LLM prompts must be language-aware. When the conversation is in Malayalam, the LLM must respond in Malayalam (transliterated or native Unicode).

**FR-20:** The STT pipeline must handle background noise (traffic, fans, crowded rooms) common in Indian call environments.

---

### 6.5 Human Agent Escalation & Call Transfer

**FR-21:** Escalation can be triggered by:
- Prospect explicitly requesting a human
- Agent detecting frustration signals (repeated "I don't understand", angry tone)
- Specific intents mapped in Admin settings (e.g., "fee negotiation" always escalates)
- After 3 failed attempts to answer a specific question from the knowledge base

**FR-22:** Warm Transfer Flow:
1. Agent informs the prospect: "Let me connect you with our counselor right away."
2. System dials the escalation number (human agent's phone)
3. Before connecting, the system plays a 10-second audio briefing to the human agent: "[Prospect Name] is calling about [Tech School / Media School]. They are interested in [topic]. Language: Malayalam."
4. The call is bridged (3-way bridge, then dropped by bot)

**FR-23:** If no human agent is available (line busy / unanswered within 20 seconds), the bot informs the prospect and offers a callback slot or takes a message.

**FR-24:** All escalation events must be logged with timestamp, reason, and outcome.

**FR-25:** The Admin can configure multiple escalation numbers with a round-robin or priority order.

---

### 6.6 Web Widget (Floating Voice Bot)

**FR-26:** A JavaScript snippet (`<script>` tag) is generated per Company Profile, which embeds a floating voice bot widget on any webpage.

**FR-27:** Widget behavior:
- Appears as a circular floating button (bottom-right corner by default, configurable)
- Displays company logo / agent avatar
- Shows a pulsing animation when the bot is speaking
- On click: opens a small panel with "Talk to AI Advisor" button
- Supports both **voice** (WebRTC microphone) and **text chat** input
- Transcription visible in real-time

**FR-28:** The widget uses WebRTC for browser-based audio capture and Sarvam AI / browser TTS for audio playback.

**FR-29:** The widget session data (conversation transcript, captured lead info) syncs to the same backend as phone calls, ensuring unified reporting.

**FR-30:** The widget must work on mobile browsers (iOS Safari, Android Chrome) without requiring app installation.

**FR-31:** Widget styling must be fully customizable by the Admin: colors, widget position, avatar image, greeting message.

---

### 6.7 Knowledge Base & RAG Pipeline

**FR-32:** Web scraper must handle:
- Static HTML pages
- JavaScript-rendered pages (Next.js, React)
- PDF documents linked from the website
- Sitemap-guided crawling

**FR-33:** Content is chunked (512 tokens per chunk, 50-token overlap), embedded using `text-embedding-3-large` or equivalent, and stored in a vector database.

**FR-34:** At query time, the system retrieves the top-5 most relevant chunks and injects them into the LLM system prompt as context.

**FR-35:** The agent must never hallucinate information not present in the knowledge base. If it cannot find an answer, it must say "I'll have our counselor get back to you on that" and flag the question for human follow-up.

**FR-36:** Admin can manually add, edit, or delete knowledge chunks from a simple UI (FAQ editor).

---

## 7. Zero-Interference Widget Integration & Autonomous Website Sync

> **Core Design Principle:** The website development team (who build and maintain bridgeon.in or any client website) must **never be asked to do anything** related to this agent — not a code change, not a config file, not a deployment step. The agent is a fully autonomous, externally attached layer. The website team only ever adds one `<script>` tag, once, forever. After that, they are free to build, deploy, redesign, and update the website at will — the agent observes and adapts automatically.

---

### 7.1 One-Time Zero-Touch Integration

**FR-37:** The entire integration with the host website is achieved by adding a **single `<script>` tag** to the website's HTML, ideally in the `<head>` or just before `</body>`:

```html
<!-- BRIDGEON TELECALLER AGENT — ADD ONCE, NEVER TOUCH AGAIN -->
<script
  src="https://agent.yourdomain.com/loader.js"
  data-company-id="bridgeon-001"
  async
  defer>
</script>
```

**FR-38:** This script tag is the complete, permanent interface between the host website and the agent system. **No other file, library, API key, environment variable, build step, or configuration change is required on the website side — ever.**

**FR-39:** The loader script is hosted entirely on the agent platform's CDN. It does not depend on any asset, module, or function from the host website.

**FR-40:** The script tag must not interfere with:
- Website page load performance (loaded `async` + `defer`)
- Existing JavaScript on the page (scoped under a unique namespace, e.g., `window.__BridgeonAgent`)
- CSS styling of the host website (all widget styles are Shadow DOM–isolated)
- Any JavaScript framework in use (React, Vue, Next.js, plain HTML — all compatible)
- SEO or Core Web Vitals scores

**FR-41:** When the website team updates, redeploys, or redesigns the website, **zero action is needed from the agent team or the website team** regarding the agent. The script tag survives across deployments naturally.

---

### 7.2 CSS & DOM Isolation via Shadow DOM

**FR-42:** The entire widget UI (button, chat panel, voice visualizer) is rendered inside a **Shadow DOM** container attached to a custom HTML element (`<bridgeon-agent-widget>`).

- All widget CSS is scoped inside the Shadow DOM — it cannot leak into the host page
- The host page's CSS cannot accidentally override widget styles
- JavaScript events are contained; no global event listeners are added except one resize observer

**FR-43:** The widget injects only one element into the host page's DOM:
```html
<bridgeon-agent-widget id="__bridgeon_agent__"></bridgeon-agent-widget>
```
This element and everything inside it is fully owned and managed by the agent platform.

---

### 7.3 Autonomous Content Sync — The "Observe & Adapt" Engine

This is the mechanism that keeps the agent's knowledge base automatically synchronized with whatever the website team publishes — with no involvement from them.

#### 7.3.1 Multi-Layer Change Detection

The agent uses **three parallel detection strategies** to catch every type of website change:

**Strategy 1 — Scheduled Full Crawl (Baseline)**

**FR-44:** The platform runs a scheduled full-site crawler (using Firecrawl or Crawlee) against the registered website URL at a configurable interval:
- Default: every 24 hours at 2 AM IST
- Configurable by Admin: hourly, every 6 hours, daily, weekly
- The crawler follows all internal links, handles JavaScript-rendered pages (headless Chromium), and downloads linked PDFs

**Strategy 2 — RSS / Sitemap Polling (Fast Delta)**

**FR-45:** After the initial crawl, the system polls the website's `sitemap.xml` and (if available) RSS/Atom feed every **15 minutes**. If any URL's `lastmod` timestamp changes, only that page is re-crawled and re-indexed — making updates visible within 15–20 minutes of the website team publishing.

**FR-46:** If no sitemap exists, the crawler falls back to polling the homepage and key section pages (configurable list) every 30 minutes for structural changes.

**Strategy 3 — Passive Observation via Injected Observer (Real-Time)**

**FR-47:** The same `loader.js` script — already on the host page — includes a lightweight **MutationObserver** that watches the page's DOM for significant content changes after initial load (e.g., dynamic content injections, SPA route transitions). When detected, it sends a lightweight "page changed" signal (URL + content hash) to the agent backend, which queues a re-crawl of that page within 5 minutes.

This covers **Single Page Applications (SPAs)** like Next.js where pages update without a full reload.

#### 7.3.2 Change Diffing & Selective Re-Indexing

**FR-48:** When a page is re-crawled, the system does not blindly re-index everything. Instead:

1. The new content is hashed (SHA-256 of cleaned text)
2. It is compared to the stored hash of the last crawl of that page
3. If hashes match → skip (no change)
4. If hashes differ → diff the content, identify changed chunks, delete stale embeddings, insert new embeddings

This means a single updated course fee on one page triggers a surgical update to only the affected vector DB chunks — not a full re-index.

**FR-49:** The Admin Dashboard shows a **Sync Log** — a chronological record of every detected change:

```
[2026-06-15 14:32 IST]  bridgeon.in/tech-school  — Content updated (3 chunks re-indexed)
[2026-06-15 09:00 IST]  bridgeon.in/placements   — No change
[2026-06-14 02:00 IST]  Full crawl completed      — 34 pages, 0 changes
```

**FR-50:** Admin can manually trigger a full re-crawl at any time with one button click ("Sync Now").

#### 7.3.3 What Triggers a Re-Sync

| Change on the website | How the agent detects it | Time to reflect |
|-----------------------|--------------------------|-----------------|
| New page added | Sitemap poll | 15–30 minutes |
| Existing page content updated | Sitemap poll + content hash diff | 15–30 minutes |
| Page deleted / URL changed | Full crawl diff | Next scheduled crawl (≤24h) |
| SPA route change (Next.js) | MutationObserver in loader.js | 5 minutes |
| New PDF linked from a page | Full crawl PDF link extractor | Next scheduled crawl |
| Price / fee change on any page | Content hash diff | 15–30 minutes |
| New course added | Sitemap + crawl | 15–30 minutes |
| Website completely redesigned | Full crawl (structural diff) | Next scheduled crawl |

---

### 7.4 Deployment Independence

**FR-51:** The agent platform and the host website are **completely separate deployments** with no shared infrastructure:

```
HOST WEBSITE (bridgeon.in)          AGENT PLATFORM (agent.yourdomain.com)
━━━━━━━━━━━━━━━━━━━━━━━━━           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Managed by: Website Team            Managed by: AI Agent Team
Deploy: Vercel / Netlify / etc.     Deploy: AWS ECS / independent
Tech: Next.js, any framework        Tech: FastAPI, Node.js, vector DB
CI/CD: Their own pipeline           CI/CD: Their own pipeline
Domain: bridgeon.in                 Domain: agent.yourdomain.com
Downtime: Affects website only      Downtime: Affects agent only
```

- If the agent platform goes down → the `<script>` tag silently fails to load, the website is completely unaffected
- If the website goes down → the agent can still handle phone calls; widget simply has no host page to appear on
- If the website team pushes a bad deploy → the agent continues serving from its last known good knowledge base
- If the agent team pushes a bad deploy → the website continues working normally; widget may be temporarily unavailable

**FR-52:** The agent platform must implement graceful degradation in the loader.js:

```javascript
// Inside loader.js — runs on the host page
try {
  initBridgeonAgentWidget(config);
} catch (e) {
  // Silently fail — never throw an uncaught error to the host page
  console.warn('[BridgeonAgent] Widget failed to initialize:', e.message);
}
```

No error in the agent widget code must ever bubble up to break the host website's JavaScript.

---

### 7.5 No Build-Time Dependencies

**FR-53:** The agent must **not** be an npm package, a build-time import, or a framework plugin. It must work purely as a runtime-loaded external script. This ensures:

- The website team never runs `npm install` for the agent
- The agent never appears in the website's `package.json`, `node_modules`, or build output
- Updating the agent (new features, bug fixes, voice improvements) happens on the agent CDN — the host website picks up the change automatically on next page load, with zero deployment required by the website team
- Versioning is managed via the CDN URL (e.g., `/loader.js` always points to latest stable; `/loader@1.2.js` for pinned version if needed)

---

### 7.6 Content Security Policy (CSP) Compatibility

**FR-54:** The `loader.js` and all agent assets must be served from a single, stable origin (`agent.yourdomain.com`) so that website teams only need to add one entry to their CSP header if they use one:

```
Content-Security-Policy: script-src 'self' agent.yourdomain.com;
                          connect-src 'self' agent.yourdomain.com;
                          frame-src agent.yourdomain.com;
```

**FR-55:** The agent must document this CSP addition clearly in its one-page integration guide. This is the only technical knowledge the website team needs — and it is optional (only relevant if the website uses a strict CSP, which most do not).

---

### 7.7 Integration Checklist for the Website Team

> This is the **complete and final** list of things the website team must do — ever.

| # | Task | Time Required | Done Once? |
|---|------|---------------|-----------|
| 1 | Add the `<script>` tag to the site's HTML template | 2 minutes | ✅ Yes, never again |
| 2 | (Optional) Add `agent.yourdomain.com` to CSP header | 5 minutes | ✅ Yes, never again |

**That's it. Nothing else. Ever.**

The website team does not need to:
- Know anything about the agent's technology
- Coordinate deployments with the agent team
- Test the agent when they push updates
- Notify the agent team when they publish new content
- Install any package or SDK
- Expose any API or webhook from the website
- Add any data attributes beyond `data-company-id`

---

## 8. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Latency** | End-to-end STT → LLM → TTS latency ≤ 2.5 seconds for 95th percentile |
| **Availability** | 99.9% uptime SLA; automated failover for telephony and AI services |
| **Scalability** | Support 500 concurrent calls without degradation |
| **Multi-tenancy** | Full data isolation between Company Profiles |
| **Accuracy** | Malayalam STT Word Error Rate (WER) ≤ 15% |
| **Security** | All calls encrypted in transit (TLS 1.3); recordings stored with AES-256 |
| **GDPR / IT Act** | Consent recorded at start of every call; data retention configurable (default 90 days) |
| **Accessibility** | Widget meets WCAG 2.1 AA for visual elements |
| **Browser Support** | Chrome 90+, Safari 14+, Firefox 90+, Edge 90+ |

---

## 8. Technology Stack

### Backend
| Component | Technology |
|-----------|------------|
| API Framework | FastAPI (Python) or Node.js (Express) |
| LLM | Claude Sonnet (Anthropic API) — primary; GPT-4o — fallback |
| STT | Sarvam AI `saarika:v2` (Malayalam/Indian languages); Deepgram (English fallback) |
| TTS | Sarvam AI `bulbul:v1` (Indian languages); ElevenLabs / Google TTS (English fallback) |
| Vector DB | Pinecone (managed) or pgvector (self-hosted) |
| Relational DB | PostgreSQL |
| Cache | Redis |
| Message Queue | RabbitMQ or Redis Streams (for outbound call campaign management) |
| Web Scraper | Firecrawl API or Crawlee (Node.js) |
| Telephony | Exotel (India-first, regulatory compliance) with Twilio as fallback |

### Frontend
| Component | Technology |
|-----------|------------|
| Admin Dashboard | Next.js 14 (React), Tailwind CSS, shadcn/ui |
| Web Widget | Vanilla JS + WebRTC (no framework dependency for minimal bundle size) |
| State Management | Zustand |

### Infrastructure
| Component | Technology |
|-----------|------------|
| Hosting | AWS (primary) — EC2 / ECS / Lambda |
| Storage | AWS S3 (call recordings, reports) |
| CI/CD | GitHub Actions |
| Monitoring | Datadog or Grafana + Prometheus |
| Secrets Management | AWS Secrets Manager |

---

## 9. API Integrations

### 9.1 Sarvam AI

| API | Purpose | Endpoint |
|-----|---------|----------|
| `saarika:v2` Speech-to-Text | Transcribe Malayalam + Indian language audio | `POST /speech-to-text` |
| `bulbul:v1` Text-to-Speech | Generate natural Malayalam voice responses | `POST /text-to-speech` |
| `mayura:v1` Translation | Translate English LLM responses to Malayalam | `POST /translate` |
| `sarvam-2b` (if applicable) | On-device / low-latency inference for widget | TBD |

**Authentication:** API key in request header `api-subscription-key`.

**Audio format:** PCM 16kHz mono for STT input; MP3 for TTS output.

### 9.2 Exotel (Telephony)

| Feature | API |
|---------|-----|
| Initiate outbound call | `POST /Accounts/{SID}/Calls/connect` |
| Receive inbound webhook | `POST /your-server/inbound-call` (configured in Exotel dashboard) |
| Play audio / stream | ExoML `<Play>` + WebSocket streaming |
| Transfer call | ExoML `<Dial>` |
| Get call recording URL | `GET /Accounts/{SID}/Calls/{CallSID}/Recordings` |

### 9.3 Anthropic Claude API

Used for:
- Generating conversational responses in context of the company knowledge base
- Intent classification (is this an escalation intent? a pricing question? an enrollment question?)
- Summarizing call transcripts for human agents

Model: `claude-sonnet-4-6`

### 9.4 Excel / Google Sheets Reporting

| Method | Detail |
|--------|--------|
| Google Sheets API v4 | Append row after each call ends |
| Excel export | Generate `.xlsx` file daily via `openpyxl` / `ExcelJS` |
| Webhook | POST call summary to a configurable webhook URL (for CRM integration) |

---

## 10. Data Models

### 10.1 Company Profile

```
CompanyProfile {
  id: UUID
  name: String
  website_url: String
  logo_url: String
  agent_name: String             // e.g., "Priya"
  primary_language: Enum         // malayalam | hindi | english | tamil | kannada
  tone: Enum                     // friendly | professional | formal
  escalation_numbers: String[]   // round-robin list
  knowledge_base_namespace: String
  widget_config: JSON            // colors, position, greeting_text
  created_at: DateTime
  updated_at: DateTime
  crawl_schedule: String         // cron expression
  last_crawled_at: DateTime
}
```

### 10.2 Lead

```
Lead {
  id: UUID
  company_profile_id: UUID
  name: String
  phone: String
  email: String?
  language_preference: Enum
  interest_tags: String[]        // e.g., ["tech_school", "mern_stack"]
  location: String?
  source: Enum                   // inbound | outbound | widget
  status: Enum                   // new | contacted | interested | enrolled | not_interested | lost
  created_at: DateTime
}
```

### 10.3 Call Record

```
CallRecord {
  id: UUID
  lead_id: UUID
  company_profile_id: UUID
  call_sid: String               // Telephony provider call ID
  direction: Enum                // inbound | outbound
  started_at: DateTime
  ended_at: DateTime
  duration_seconds: Integer
  language_used: Enum
  transcript: Text               // Full conversation transcript
  summary: Text                  // AI-generated call summary (3–5 lines)
  sentiment: Enum                // positive | neutral | negative
  outcome: Enum                  // interested | not_interested | callback_scheduled | escalated | voicemail | no_answer
  escalated: Boolean
  escalation_reason: String?
  human_agent_reached: Boolean
  recording_url: String?
  excel_synced: Boolean
  excel_row_id: String?
}
```

### 10.4 Campaign

```
Campaign {
  id: UUID
  company_profile_id: UUID
  name: String
  lead_csv_url: String
  status: Enum                   // draft | running | paused | completed
  calling_window_start: Time     // e.g., 10:00
  calling_window_end: Time       // e.g., 18:00
  timezone: String               // e.g., "Asia/Kolkata"
  max_attempts: Integer          // default: 3
  retry_interval_hours: Integer  // default: 24
  daily_call_limit: Integer
  created_at: DateTime
  completed_at: DateTime?
  total_leads: Integer
  contacted: Integer
  interested: Integer
}
```

---

## 11. Admin Dashboard Requirements

### 11.1 Company Management
- Create / Edit / Delete Company Profiles
- Input website URL → trigger crawl → show crawl status and page count
- Preview the knowledge base chunks; add/edit/delete entries manually
- Test the agent in a chat interface before going live

### 11.2 Campaign Management
- Upload lead CSV (template downloadable)
- Configure campaign parameters (window, retries, limit)
- Start / Pause / Resume campaigns
- Real-time dashboard: calls in progress, answered, pending, failed

### 11.3 Call Logs & Analytics
- Searchable call log table (filter by date, outcome, language, campaign)
- Click to expand: full transcript, AI summary, recording player
- Charts: call volume by day, outcome breakdown (pie), language distribution, escalation rate

### 11.4 Human Agent Management
- Add / remove escalation numbers per Company Profile
- Set priority / round-robin order
- View agent availability (manual toggle: Available / Unavailable)

### 11.5 Reporting & Export
- Export call logs as `.xlsx` with configurable columns
- Auto-sync to linked Google Sheet (configure once per Company Profile)
- Schedule daily email report to admin email(s)

### 11.6 Widget Configuration
- Live preview of the widget
- Toggle widget on/off per Company Profile
- Copy JavaScript snippet for website embedding

---

## 12. Web Widget (Pop-up Voice Bot)

### 12.1 Embedding

The client adds a single `<script>` tag to their webpage:

```html
<script
  src="https://your-platform.com/widget.js"
  data-company-id="COMPANY_PROFILE_ID"
  data-position="bottom-right"
  data-color="#1a73e8"
  async>
</script>
```

### 12.2 Widget States

| State | UI |
|-------|----|
| Idle | Floating circular button with pulse animation |
| Greeting | Expands to show agent avatar + "Hi! How can I help you?" |
| Listening | Waveform animation, microphone active |
| Thinking | Spinner / "..." animation |
| Speaking | Animated mouth / waveform, TTS audio plays |
| Escalating | "Connecting you to a counselor..." message |
| Ended | Thank you message + option to restart |

### 12.3 Session Flow

1. User clicks widget button
2. Widget requests microphone permission
3. Agent greets in detected / default language
4. Conversation proceeds (STT → LLM → TTS loop)
5. Lead details collected within conversation
6. Optional: "Would you like us to call you?" — collects phone number
7. Session ends; data synced to backend; Excel row added

### 12.4 Fallback to Text

If microphone permission is denied or browser is incompatible, widget automatically falls back to a text chat interface with the same AI agent backend.

---

## 13. Call Flows & Conversation Design

### 13.1 Inbound Call Flow

```
CALL RECEIVED
     │
     ▼
GREETING (in English / Malayalam based on auto-detect)
"നമസ്കാരം! ഞാൻ Priya, Bridgeon Skillversity-യിൽ നിന്ന്. 
 ഞാൻ നിങ്ങൾക്ക് എങ്ങനെ സഹായിക്കാം?"
     │
     ▼
LISTEN TO INTENT
     │
     ├─── Course inquiry ──────► EXPLAIN COURSE (from KB) → CAPTURE INTEREST → CTA
     │
     ├─── Fee inquiry ─────────► EXPLAIN FEE STRUCTURE → OFFER COUNSELING SESSION
     │
     ├─── Placement inquiry ───► SHARE STATS (150+ companies, 100% placement support)
     │
     ├─── Enrollment ──────────► CAPTURE DETAILS → SCHEDULE CALLBACK → LOG LEAD
     │
     ├─── Complaints / Issues ─► EMPATHIZE → ESCALATE TO HUMAN
     │
     └─── "Talk to human" ─────► WARM TRANSFER FLOW
                                          │
                                          ▼
                               DIAL HUMAN AGENT
                               PLAY CONTEXT BRIEFING
                               BRIDGE CALL
```

### 13.2 Outbound Call Flow

```
CAMPAIGN TRIGGERED
     │
     ▼
DIAL LEAD
     │
     ├─── No answer / Voicemail ──► LOG ATTEMPT → RETRY (up to 3x)
     │
     └─── Answered
               │
               ▼
          GREETING + PERMISSION CHECK
          "Hi [Name], I'm Priya calling from Bridgeon Skillversity. 
           Is this a good time to talk for 2 minutes?"
               │
               ├─── "No" / "Not now" ──► "Can I call back at [time]?" → SCHEDULE → LOG
               │
               └─── "Yes" / Positive
                         │
                         ▼
                    PITCH (30–45 seconds, tailored to lead tag)
                         │
                         ▼
                    HANDLE OBJECTIONS
                         │
                         ▼
                    CTA: "Would you like to speak to our counselor 
                          or visit us at our [nearest] branch?"
                         │
                         ├─── Interested ──► CAPTURE DETAILS → SCHEDULE → LOG
                         └─── Not interested ──► THANK → LOG → MARK CLOSED
```

### 13.3 Sample Dialogue (Malayalam)

```
Agent:  "നമസ്കാരം! ഞാൻ Priya, Bridgeon Skillversity-യിൽ നിന്ന് സംസാരിക്കുന്നു. 
         Tech School-നെ കുറിച്ച് കൂടുതൽ അറിയണോ?"

Prospect: "അതെ, MERN stack course-നെ കുറിച്ച് പറഞ്ഞേ."

Agent:  "ഞങ്ങളുടെ MERN Stack course ആറ് മാസത്തെ intensive program ആണ്. 
         MongoDB, Express, React, Node.js എന്നിവ live projects-ഇൽ പഠിക്കാം. 
         Course കഴിഞ്ഞാൽ 150-ലധികം companies-ൽ placement support ഉണ്ട്. 
         Fee-നെ കുറിച്ച് detailed-ആയി ഒരു counselor-uമായി സംസാരിക്കണോ?"

Prospect: "Fee എത്ര?"

Agent:  "Fee structure course duration-നും payment plan-നും അനുസരിച്ച് വ്യത്യാസപ്പെടും. 
         Scholarship options-ഉം ഉണ്ട്. ഞാൻ ഒരു counselor-നെ connect ചെയ്യട്ടേ?"
```

---

## 14. Excel / CRM Reporting

### 14.1 Auto-Generated Excel Report Columns

| Column | Description |
|--------|-------------|
| Call Date | Date of call (DD/MM/YYYY) |
| Call Time | Time of call (HH:MM IST) |
| Prospect Name | Captured from conversation |
| Phone Number | Lead phone number |
| Language | Language used in call |
| Direction | Inbound / Outbound |
| Campaign Name | (for outbound) |
| Duration (min) | Call duration |
| Outcome | Interested / Not Interested / Callback / Escalated / Voicemail |
| Interest Area | Tech School / Media School / etc. |
| Location | City/district mentioned |
| Callback Scheduled | Date/Time if scheduled |
| Escalated | Yes / No |
| Escalation Reason | If escalated |
| Human Agent Reached | Yes / No |
| AI Summary | 2–3 line summary of call |
| Sentiment | Positive / Neutral / Negative |
| Follow-up Required | Yes / No (auto-tagged) |

### 14.2 Google Sheets Sync

- Each Company Profile can link one Google Sheet
- After every call ends, a new row is appended automatically using Google Sheets API
- The sheet is organized with one tab per month (auto-created)
- A summary dashboard tab is maintained with pivot-like aggregations

### 14.3 Daily Email Report

- Sent at 8 PM IST to configured admin emails
- Contains: total calls, breakdown by outcome, top interests, escalation count, campaign progress
- Attached `.xlsx` of the day's call log

---

## 15. Security & Compliance

### 15.1 Data Privacy

- All call recordings are encrypted at rest (AES-256) in S3
- PII (name, phone, email) is stored in encrypted DB columns
- Data retention policy: configurable per Company Profile (default 90 days)
- DPDP (Digital Personal Data Protection Act, India 2023) compliance required

### 15.2 Call Consent

- Every call must begin with a consent statement:
  - Inbound: "This call may be recorded for quality purposes. By continuing, you consent."
  - Outbound: Consent recorded as part of the campaign opt-in list

### 15.3 Authentication & Access Control

- Admin Dashboard: Multi-factor authentication (TOTP)
- Role-based access: Super Admin, Company Admin, Agent (read-only)
- API: JWT tokens with 1-hour expiry + refresh tokens
- Webhook endpoints: HMAC signature verification

### 15.4 Telephony Compliance

- TRAI DND (Do Not Disturb) scrubbing required before outbound calls
- Calling hours strictly enforced (9 AM–9 PM as per TRAI guidelines)
- Caller ID must display registered business number

---

## 16. Milestones & Phased Rollout

### Phase 1 — Foundation (Weeks 1–4)

| Task | Owner | Duration |
|------|-------|----------|
| System architecture finalization | Engineering Lead | Week 1 |
| Sarvam AI API integration (STT + TTS) | AI Engineer | Week 1–2 |
| RAG pipeline (scraper + vector DB + retrieval) | AI Engineer | Week 2–3 |
| Telephony integration with Exotel (inbound) | Backend Dev | Week 2–3 |
| LLM agent loop (Claude integration) | AI Engineer | Week 3 |
| Basic inbound call end-to-end test with Bridgeon KB | QA | Week 4 |

### Phase 2 — Core Product (Weeks 5–8)

| Task | Owner | Duration |
|------|-------|----------|
| Admin Dashboard v1 (company profile, KB management) | Frontend Dev | Week 5–6 |
| Outbound calling + campaign management | Backend Dev | Week 5–6 |
| Human agent escalation + warm transfer | Backend Dev | Week 6–7 |
| Excel / Google Sheets auto-sync | Backend Dev | Week 7 |
| Multilingual testing (Malayalam, Hindi, English) | QA | Week 8 |

### Phase 3 — Widget & Polish (Weeks 9–12)

| Task | Owner | Duration |
|------|-------|----------|
| Web widget (voice + text fallback) | Frontend Dev | Week 9–10 |
| Widget admin configuration + embed snippet | Frontend Dev | Week 10 |
| Call analytics dashboard | Frontend Dev | Week 10–11 |
| Security audit + DND scrubbing | Engineering Lead | Week 11 |
| Bridgeon production deployment | All | Week 12 |
| Load testing (500 concurrent calls) | QA | Week 12 |

### Phase 4 — White-Label (Post Week 12)

| Task | Description |
|------|-------------|
| White-label packaging | Multi-company onboarding, isolated namespaces |
| Self-serve onboarding flow | Any company enters URL, bot is live in 30 min |
| Billing & subscription module | Per-minute pricing, campaign pricing |
| Documentation & developer portal | API docs, embed guide, FAQ |

---

## 8. Human Recording Upload & Conversational Learning Engine

> **Core Design Principle:** Real human telecaller sessions — the actual voice conversations between Bridgeon's best sales agents and real prospects — are the most valuable training signal available. This system lets the admin upload batches of these recordings. The platform automatically transcribes them, analyzes tone, strategy, and content patterns, extracts winning conversation structures, and applies these learnings to continuously improve the AI agent's voice tone, pitch strategy, language style, and objection handling — without any manual prompt engineering.

---

### 8.1 Overview & Learning Dimensions

The agent learns from uploaded human recordings across four distinct dimensions:

| Dimension | What is Learned | How It's Applied |
|-----------|-----------------|-----------------|
| **Voice Tone & Prosody** | Pace, warmth, emphasis patterns, pause usage, energy level at key moments | Guides TTS style parameters and pacing instructions sent to Sarvam AI |
| **Conversation Strategy** | When to pitch vs listen, how to handle silence, when to escalate vs persist | Updates the agent's conversation state machine and decision logic |
| **Content & Messaging** | Which phrases, course descriptions, and value props resonated; which fell flat | Enriches the knowledge base with high-performing language patterns |
| **Objection Handling** | How top agents responded to fee concerns, competitor mentions, time objections | Builds a ranked objection-handling playbook used by the LLM |

---

### 8.2 Recording Upload Interface

**FR-56:** The Admin Dashboard includes a dedicated **"Learning Studio"** section under each Company Profile.

**FR-57:** Admin can upload recordings in the following formats:
- Audio: `.mp3`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.flac`
- Video (audio extracted automatically): `.mp4`, `.mov`, `.webm`
- Maximum file size: 500 MB per file
- Batch upload: up to 50 files at once via drag-and-drop or file picker

**FR-58:** For each uploaded recording (or batch), the Admin must provide the following metadata before processing begins:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Session Label | Text | Yes | e.g., "Best closer — Rahul, March 2026" |
| Outcome | Dropdown | Yes | Enrolled / Interested / Not Interested / Callback |
| Language(s) | Multi-select | Yes | Malayalam / Hindi / English / Mixed |
| Agent Name | Text | No | Name of the human telecaller |
| Call Direction | Radio | Yes | Inbound / Outbound |
| Campaign / Context | Text | No | e.g., "MERN batch June 2026 cold call" |
| Quality Rating | 1–5 stars | Yes | Admin's subjective rating of the call quality |
| Notes | Textarea | No | Any manual observations about this call |

**FR-59:** Admin can organize recordings into **Learning Sets** — named collections (e.g., "Top 20 Closers Q1 2026", "Malayalam Objection Handling", "Failed Calls — Analysis"). The AI learns differently from sets tagged as high-performing vs low-performing (see Section 8.5).

**FR-60:** Upload progress is shown per file with status: `Uploading → Transcribing → Analyzing → Indexed`.

---

### 8.3 Transcription Pipeline

**FR-61:** Upon upload, every recording goes through a multi-step transcription pipeline:

```
AUDIO FILE UPLOADED
        │
        ▼
AUDIO PREPROCESSING
  - Normalize volume
  - Noise reduction (noisereduce library)
  - Split stereo into 2 mono channels (Agent channel / Customer channel)
        │
        ▼
SPEAKER DIARIZATION
  - Identify and label speakers: AGENT vs CUSTOMER
  - Timestamp each turn: [00:00:04] AGENT: "നമസ്കാരം..."
  - Tool: pyannote/speaker-diarization or AWS Transcribe Speaker Identification
        │
        ▼
MULTILINGUAL TRANSCRIPTION
  - Malayalam segments → Sarvam AI saarika:v2 STT
  - English segments → Deepgram / Whisper
  - Code-switched segments → Sarvam AI (handles Manglish natively)
        │
        ▼
STRUCTURED TRANSCRIPT
  - JSON with speaker labels, timestamps, language tags, confidence scores
        │
        ▼
ANALYSIS ENGINE (Section 8.4)
```

**FR-62:** The structured transcript is stored alongside the original audio. Both are accessible from the Learning Studio for human review.

**FR-63:** Transcription confidence score is shown per segment. Low-confidence segments (<75%) are flagged for optional human correction in an inline transcript editor.

**FR-64:** Admin can manually correct the transcript in the UI (click a segment → edit text inline → save). Corrected segments are marked as ground truth and weighted higher in analysis.

---

### 8.4 Conversation Analysis Engine

After transcription, each session is analyzed across multiple analytical lenses.

#### 8.4.1 Structural Analysis — Conversation Arc Mapping

**FR-65:** The engine maps each conversation to a structured arc:

```
CONVERSATION ARC (auto-detected phases)
┌─────────────┬──────────────┬──────────────┬──────────────┬────────────┐
│  Opening    │  Discovery   │  Pitch       │  Objection   │  Close /   │
│  (0–60s)    │  (1–3 min)   │  (2–5 min)   │  Handling    │  Exit      │
│             │              │              │  (variable)  │            │
└─────────────┴──────────────┴──────────────┴──────────────┴────────────┘
```

For each phase, the engine extracts:
- Duration and proportion of total call
- Talk-time ratio (Agent % vs Customer %)
- Sentiment trajectory (positive / neutral / negative per phase)
- Key phrases used by the agent
- Customer engagement signals (questions asked, positive acknowledgments, laugh markers)

**FR-66:** The engine compares arc structures of successful calls (enrolled / interested) vs unsuccessful calls and identifies statistically significant structural patterns — e.g., "In 84% of successful Malayalam calls, the agent asked a discovery question within the first 45 seconds."

#### 8.4.2 Tone & Prosody Analysis

**FR-67:** Audio features are extracted from the agent's speech channel:

| Feature | Description |
|---------|-------------|
| Speaking rate | Words per minute — avg and variance across call phases |
| Pitch mean & range | Fundamental frequency (F0) — warmth, authority signal |
| Energy / volume | Loudness variation — enthusiasm indicators |
| Pause patterns | Duration and placement of deliberate pauses |
| Smile detection | Spectral markers associated with smiling while speaking |
| Fillers | Frequency of "um", "like", "aah", "erm", regional equivalents |

Tool: `librosa` (Python audio analysis) + `parselmouth` (Praat-based pitch extraction)

**FR-68:** The engine builds a **Tone Profile** for each recording and aggregates a **Target Tone Model** from the top-rated recordings (4–5 stars). This model is expressed as a set of TTS style parameters:

```json
{
  "speaking_rate": 0.92,
  "pitch_shift": +0.05,
  "energy_boost_at_pitch": true,
  "pause_before_cta_ms": 800,
  "warmth_level": "high"
}
```

**FR-69:** These parameters are injected into the TTS generation request sent to Sarvam AI's `bulbul` model (or via SSML tags where supported), making the AI agent's voice progressively closer to the tone profile of the best human callers.

#### 8.4.3 Content & Phrase Mining

**FR-70:** The engine performs phrase-level analysis to identify high-signal language:

- **Power Phrases** — phrases used by the agent in calls with positive outcomes that are absent or rare in negative-outcome calls (e.g., "നിങ്ങൾക്ക് ആദ്യ ബാച്ചിൽ ഒരു സ്ഥാനം ഉറപ്പിക്കാം" — "We can secure a spot for you in the first batch")
- **Drop Phrases** — phrases statistically associated with call drops or negative outcomes
- **Resonance Moments** — sentences after which the customer's sentiment measurably improved (detected via sentiment shift in the following customer turn)

**FR-71:** Extracted power phrases are added to the LLM system prompt as a **Preferred Language Patterns** section, instructing the model to favor these phrasings when constructing responses.

**FR-72:** Drop phrases are added to a negative examples list — the LLM is instructed to avoid them.

#### 8.4.4 Objection Handling Playbook

**FR-73:** Every customer objection detected in the transcripts is extracted, categorized, and paired with the agent's response and the call outcome. This builds a ranked **Objection Playbook**:

| Objection Category | Example (Malayalam) | Best Response Pattern | Win Rate |
|--------------------|--------------------|-----------------------|----------|
| Fee too high | "ഇത്ര fee കൊടുക്കാൻ കഴിയില്ല" | Acknowledge → EMI option → ROI frame | 67% |
| Need time to decide | "ഒന്ന് ആലോചിക്കട്ടെ" | Agree → Scarcity signal → Specific callback | 54% |
| Competitor mention | "X institute-ൽ cheaper" | Validate → Differentiate placement stats → Offer visit | 61% |
| Parents need to agree | "അമ്മ / അച്ഛൻ agree ആകണം" | Offer 3-way call → Parent-specific pitch | 72% |

**FR-74:** The objection playbook is injected into the LLM's system prompt dynamically when an objection is detected mid-call — the most statistically successful response pattern for that objection category is suggested to the model as the preferred approach.

**FR-75:** The playbook is visible and editable in the Admin Dashboard. Admins can override any auto-generated response pattern or add manual entries.

---

### 8.5 Learning Modes — Positive vs Negative Examples

**FR-76:** The system learns asymmetrically from different call outcomes:

| Recording Outcome | Learning Role | How Used |
|-------------------|---------------|----------|
| ⭐⭐⭐⭐⭐ + Enrolled | **Positive exemplar** | Tone model target; phrase mining for power phrases; arc structure template |
| ⭐⭐⭐⭐ + Interested | **Positive exemplar** | Same as above, weighted slightly lower |
| ⭐⭐ + Not Interested | **Negative exemplar** | Drop phrase extraction; identify arc patterns to avoid |
| ⭐ + Hung up early | **Failure signal** | Identify opening patterns that lose engagement; flagged for opening redesign |
| Any + Escalated to human | **Escalation signal** | Identify what triggers escalation; improve agent's ability to pre-empt those needs |

**FR-77:** The Admin can override the learning role of any recording — e.g., mark a "Not Interested" call as a positive example if the technique was excellent but the prospect was genuinely unqualified.

---

### 8.6 Learning Application — How Learnings Reach the Agent

The insights extracted from recordings reach the live agent through three channels:

```
HUMAN RECORDINGS
       │
       ▼
ANALYSIS ENGINE
       │
       ├──► TONE PROFILE ──────────► TTS parameters (Sarvam AI voice style)
       │
       ├──► POWER PHRASES ─────────► LLM system prompt (preferred language section)
       │                              Updated per Company Profile
       │
       ├──► OBJECTION PLAYBOOK ────► LLM dynamic context injection (mid-call)
       │
       ├──► ARC STRUCTURE ─────────► Conversation state machine weights
       │                              (when to transition between phases)
       │
       └──► DROP PHRASES ──────────► LLM negative examples (avoid these)
```

**FR-78:** Learnings are scoped per Company Profile — Bridgeon's learnings never influence another company's agent.

**FR-79:** Every update to the agent's behavior from a learning cycle is logged with:
- Source recordings used
- Timestamp
- What changed (e.g., "3 new power phrases added", "Objection playbook updated: Fee objection")
- Admin who approved (if manual approval is enabled — see FR-81)

**FR-80:** The Admin Dashboard shows a **Learning Impact Report** after each analysis cycle:
- Before/after comparison of key metrics (simulated on a held-out test set of recordings)
- Predicted improvement in conversion rate based on pattern matching
- Confidence level of each extracted insight (based on sample size)

**FR-81:** Admin can configure learning application as:
- **Auto-apply** — learnings go live automatically after analysis (default)
- **Review & Approve** — Admin sees a diff of what will change and must approve before it goes live (recommended for first few cycles)

---

### 8.7 Continuous Learning from Live Agent Calls

**FR-82:** In addition to manually uploaded recordings, the platform automatically feeds every live AI agent call back into the learning pipeline:

- Every completed call is scored by the LLM (post-call sentiment, outcome quality, engagement score)
- Calls scoring above a threshold (configurable, default: top 20%) are automatically added to the positive learning pool
- Calls scoring below a threshold (bottom 20%) are flagged as negative examples
- The learning pipeline re-runs on a weekly basis by default, incorporating the latest live call data

This creates a **self-improving feedback loop**: the agent makes calls → calls are analyzed → agent improves → makes better calls.

```
┌─────────────────────────────────────────────────────────┐
│               CONTINUOUS IMPROVEMENT LOOP               │
│                                                         │
│  Upload Human     ──►  Analysis   ──►  Agent Updated   │
│  Recordings             Engine                          │
│                            ▲                │           │
│                            │                ▼           │
│                      Live AI Calls  ◄── Better Agent   │
│                      Auto-scored                        │
│                      & Fed Back                         │
└─────────────────────────────────────────────────────────┘
```

**FR-83:** The Admin can view a **Learning Timeline** — a chronological history of all learning cycles, what data went in, and what metrics changed as a result.

---

### 8.8 Privacy & Consent for Uploaded Recordings

**FR-84:** Uploaded human recordings must only contain calls where the customer gave explicit consent to be recorded. The Admin must check a consent acknowledgment checkbox before each batch upload.

**FR-85:** Uploaded recordings are stored in encrypted S3 with a separate access policy from live call recordings. Only Super Admin and Company Admin roles can access raw uploaded recordings.

**FR-86:** Customer voice data from uploaded recordings is used only for:
- Transcription (to extract text)
- Sentiment analysis (to label turns as positive/negative)
- No customer voice biometrics are extracted or stored

**FR-87:** Agent (human telecaller) voice data from uploaded recordings is used for prosody analysis to build the tone model. Telecallers whose recordings are used must be informed per the company's internal HR/consent policy. The platform does not enforce this but documents the requirement.

**FR-88:** Uploaded recordings and their transcripts are retained for a configurable period (default: 1 year) and can be deleted individually or in bulk by the Admin at any time.

---

## 9. Reinforcement Learning Engine — Autonomous Self-Improvement

> **Core Design Principle:** Every single call the agent makes — whether it ends in an enrollment, a hang-up after 4 seconds, or anything in between — is a training signal. The agent does not need a human to tell it what went wrong. It observes the outcome of every action it takes, scores itself, and updates its own strategy. Over thousands of calls, it converges on the most effective way to open, pitch, handle objections, and close — for each language, each customer segment, and each product — entirely on its own. This is not periodic batch retraining. It is a live, always-on learning loop.

---

### 9.1 The Reinforcement Learning Framing

The agent's sales conversation is modeled as a **Markov Decision Process (MDP)**:

```
STATE (s)         — What the agent knows right now
                    (conversation phase, customer sentiment, last utterance,
                     objections raised, time elapsed, language, lead source)

ACTION (a)        — What the agent says or does next
                    (opening line chosen, pitch angle used, objection response,
                     tone level, pace, CTA phrasing, escalation decision)

REWARD (r)        — The signal that tells the agent how well it did
                    (see Section 9.2 — Reward Signal Design)

POLICY (π)        — The agent's learned strategy: given state s, which action a
                    maximizes cumulative future reward?
```

The RL engine continuously refines the **policy** — the agent's decision-making strategy — based on rewards accumulated across all calls. As call volume grows, the policy becomes sharper and more tailored to what actually converts.

---

### 9.2 Reward Signal Design

This is the most critical design decision in the RL system. Every call produces a **Reward Score** between **-1.0 and +1.0** composed of weighted sub-signals:

#### 9.2.1 Outcome Rewards (End-of-Call)

| Outcome | Reward | Rationale |
|---------|--------|-----------|
| Customer enrolled / paid | **+1.00** | Ultimate goal achieved |
| Customer booked a counseling session | **+0.75** | Strong intent signal |
| Customer requested a callback (scheduled) | **+0.50** | Warm lead retained |
| Call ended positively — customer said "I'll think about it" | **+0.20** | Soft positive |
| Call ended neutrally — no commitment | **0.00** | Neutral |
| Customer said "Not interested" after full pitch | **-0.10** | Mild negative — at least they heard the pitch |
| Customer hung up during the pitch phase (after 60s) | **-0.40** | Lost engagement mid-call |
| Customer hung up during the opening (within 30s) | **-0.70** | Opening failed |
| Customer hung up within 10 seconds | **-1.00** | Immediate rejection — worst case |
| Customer complained or was abusive | **-0.80** | Approach was wrong |

#### 9.2.2 In-Call Micro-Rewards (Per Turn)

Beyond the final outcome, the agent receives micro-rewards at the turn level, enabling it to learn which specific moments in the conversation drove the outcome:

| Signal | Micro-Reward | How Detected |
|--------|-------------|--------------|
| Customer asked a question (engaged) | **+0.08** | Question mark detection in transcript |
| Customer laughed or expressed warmth | **+0.10** | Sentiment classifier on customer turn |
| Customer's sentiment improved vs previous turn | **+0.05** | Delta sentiment score |
| Customer gave personal information voluntarily | **+0.12** | NER detects name/location/interest shared |
| Customer said "yes", "okay", "sure" | **+0.06** | Affirmation keyword detection |
| Customer interrupted the agent mid-sentence | **-0.05** | Overlap detection in diarized audio |
| Customer went silent for >8 seconds | **-0.08** | Silence gap detector |
| Customer's sentiment worsened vs previous turn | **-0.07** | Delta sentiment score |
| Customer said "stop calling", "not interested", "remove my number" | **-0.30** | Explicit rejection keywords |

#### 9.2.3 Efficiency Rewards

| Signal | Reward | Rationale |
|--------|--------|-----------|
| Positive outcome in under 4 minutes | **+0.15** | Efficient conversion |
| Positive outcome between 4–8 minutes | **+0.05** | Normal range |
| Positive outcome after 12+ minutes | **-0.05** | Took too long — improve directness |
| Unnecessary filler or repetition detected | **-0.03** | Per occurrence |

#### 9.2.4 Composite Reward Formula

```
R(call) = w₁ × OutcomeReward
        + w₂ × Σ(MicroRewards per turn)
        + w₃ × EfficiencyReward
        + w₄ × LanguageAccuracyBonus  ← bonus if STT confidence was high throughout
        
Default weights: w₁=0.60, w₂=0.25, w₃=0.10, w₄=0.05
(Configurable by Admin — e.g., raise w₁ weight for pure conversion focus)
```

---

### 9.3 What the Agent Can Learn to Vary (The Action Space)

The RL engine does not retrain the underlying LLM weights — that would require massive compute and create unpredictability. Instead, it learns to **control a set of well-defined, bounded levers** that shape the agent's behavior:

#### 9.3.1 Opening Strategy Variants

The agent maintains a library of **Opening Strategies** and learns which performs best per context:

| Strategy ID | Opening Style | Example |
|-------------|--------------|---------|
| `OPEN_WARM_Q` | Start with a personal question | "Hi [Name], how are you doing today?" |
| `OPEN_DIRECT_HOOK` | Lead with a bold value statement | "Hi [Name], what if I told you we can get you placed in 6 months?" |
| `OPEN_SOFT_INTRO` | Gentle brand introduction | "Hi, I'm calling from Bridgeon — Kerala's top skill school. Is this a good time?" |
| `OPEN_PROBLEM_FIRST` | Open with the customer's pain | "Hi [Name], are you currently looking for better career options after your degree?" |
| `OPEN_SOCIAL_PROOF` | Lead with numbers | "Hi [Name], we've placed 500+ students this year — wanted to share how you could be next." |
| `OPEN_LOCAL_CONNECT` | Use regional/language warmth | "നമസ്കാരം [Name], ഞാൻ Bridgeon-ൽ നിന്നാണ്..." |

The RL engine tracks the reward distribution for each opening strategy, segmented by: language, lead source, time of day, call direction. It learns to select the optimal strategy for each context.

#### 9.3.2 Pitch Angle Variants

| Angle ID | Focus | Best for |
|----------|-------|----------|
| `PITCH_PLACEMENT` | Job placement stats and hiring partners | Job-seekers, fresh graduates |
| `PITCH_SKILLS` | Technical depth, live projects, curriculum | Technically curious students |
| `PITCH_SPEED` | Short course duration, fast ROI | Impatient prospects |
| `PITCH_CREDIBILITY` | Industry reviews, faculty, UGC recognition | Parents, skeptical prospects |
| `PITCH_PEERS` | Student success stories, community | Social-proof motivated |
| `PITCH_EARN_WHILE` | Earn while you learn (Skill First Degree) | Working adults |

#### 9.3.3 Tone & Pace Parameters

The agent continuously experiments with and refines:

| Parameter | Range | RL Learns |
|-----------|-------|-----------|
| Speaking rate | 0.80× – 1.20× | Which rate reduces hang-ups in opening |
| Energy level | Low / Medium / High | When high energy helps vs hurts |
| Pause length before CTA | 0.3s – 1.5s | Optimal pause for prospect to absorb |
| Formality level | Casual / Balanced / Formal | Per language and lead segment |
| Use of prospect's name | Every turn / Every 3 turns / Rarely | Frequency that feels personal vs intrusive |

#### 9.3.4 Objection Response Selection

For each detected objection category, the agent has multiple response options. RL learns the ranked order per context:

```
Objection: "Fee too high"
Options:
  A → EMI breakdown + ROI calculation      [current win rate: 67%]
  B → Scholarship mention + urgency        [current win rate: 54%]
  C → Peer comparison ("others earning X") [current win rate: 48%]
  D → Soft redirect to counselor           [current win rate: 71%] ← RL ranked #1
```

#### 9.3.5 CTA (Call-to-Action) Variants

| CTA ID | Phrasing | RL tracks |
|--------|---------|-----------|
| `CTA_BOOK_NOW` | "Let me book a free counseling slot for you right now." | Hard close conversion rate |
| `CTA_VISIT` | "Can you visit our [nearest branch] this week?" | Show-up rate |
| `CTA_CALLBACK` | "When's a good time for our counselor to call you?" | Callback kept rate |
| `CTA_WHATSAPP` | "Can I send you our course details on WhatsApp?" | Engagement rate post-call |
| `CTA_SOFT` | "Think about it and I'll follow up in a few days." | Long-term conversion rate |

---

### 9.4 The RL Learning Loop — Step by Step

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    REINFORCEMENT LEARNING LOOP                          │
│                                                                         │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────┐   ┌───────────┐  │
│  │  CALL    │    │  REAL-TIME   │    │  POST-CALL  │   │  POLICY   │  │
│  │  BEGINS  │───►│  STATE       │───►│  REWARD     │──►│  UPDATE   │  │
│  │          │    │  TRACKING    │    │  CALCULATION│   │  ENGINE   │  │
│  └──────────┘    └──────────────┘    └─────────────┘   └─────┬─────┘  │
│       ▲                                                        │        │
│       │              ┌────────────────────────────────────────┘        │
│       │              │  Updated Policy (action selection weights)       │
│       │              ▼                                                  │
│  ┌────┴─────────────────────────────────────────────────────────────┐  │
│  │                     POLICY STORE (per Company Profile)           │  │
│  │                                                                   │  │
│  │  Opening Strategy weights  │  Pitch Angle weights                │  │
│  │  Tone parameters           │  Objection response rankings        │  │
│  │  CTA variant weights       │  Phase transition thresholds        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│       │                                                                  │
│       ▼                                                                  │
│  NEXT CALL uses the updated policy ──► loop continues                   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Step 1 — Call begins:** The RL engine selects actions using the current policy (with ε-greedy exploration — see Section 9.5).

**Step 2 — Real-time state tracking:** Every agent turn is logged with: (state, action_taken, micro_reward). The state vector includes conversation phase, customer sentiment trend, objections raised so far, time elapsed, language, lead segment.

**Step 3 — Post-call reward calculation:** After the call ends, the composite reward is calculated (Section 9.2.4) and assigned to the full episode.

**Step 4 — Credit assignment:** The reward is back-propagated across all turns using a **temporal difference (TD) method** — turns closer to the final outcome receive stronger credit/blame. An early action that started a positive trajectory gets partial credit even if it happened 5 minutes before the enrollment.

**Step 5 — Policy update:** The policy weights for the action choices made in this call are nudged — increased if reward was positive, decreased if negative — using a learning rate that starts high and gradually decays as the policy matures (to avoid unlearning stable good behavior).

**Step 6 — Policy stored, next call uses it.**

---

### 9.5 Exploration vs Exploitation — How the Agent Experiments

A pure exploitation agent would always do the same thing once it finds something that works. It would never discover better strategies. The RL engine uses **ε-greedy exploration with decay**:

```
ε (epsilon) = exploration rate

Early phase (calls 0–500):     ε = 0.30  → 30% of the time, try a random action variant
Growth phase (calls 500–2000): ε = 0.15  → 15% exploration
Mature phase (2000+ calls):    ε = 0.05  → 5% exploration — mostly exploiting best known policy
```

In practice this means:
- In the first 500 calls, the agent actively experiments — trying different openings, pitches, CTAs even when one seems to be working
- As call volume grows, it increasingly commits to what the data shows works best
- But it always keeps 5% exploration to discover emerging better strategies and adapt if the market changes

**FR-89:** The exploration rate (ε) is visible in the Admin Dashboard and can be manually overridden — e.g., bump it up to 0.25 when launching a new product/course to force fresh experimentation.

---

### 9.6 Contextual Bandits — Per-Segment Policy Specialization

The agent does not learn one universal policy. It learns **separate specialized policies** for different call contexts, using a **contextual bandit** approach:

| Context Dimension | Values | Separate policy learned per value |
|-------------------|--------|----------------------------------|
| Language | Malayalam / Hindi / English / Tamil | What works in Malayalam may not work in Hindi |
| Lead Source | Inbound / Outbound / Widget | Inbound prospects are warmer — different opening needed |
| Time of Day | Morning (6–10AM) / Afternoon / Evening | Evening calls need shorter, more direct pitch |
| Course Interest | Tech School / Media School / Business School / Degree | Each product has its own best pitch angle |
| Prior Call Count | First contact / 2nd attempt / 3rd attempt | Repeat contacts need a different approach |
| Customer Age Signal | Student / Working adult / Parent calling for child | Completely different value propositions |
| Geography | Kerala / Tamil Nadu / Other | Regional cultural cues differ |

This produces a **policy matrix** — a multi-dimensional table of what works best for each combination of context dimensions. Over time, the agent becomes highly specialized: it knows that a Malayalam-speaking, evening-time, Tech School inbound call responds best to `OPEN_SOFT_INTRO` followed by `PITCH_PLACEMENT` with a `CTA_BOOK_NOW`, while a Hindi-speaking outbound call in the morning works better with `OPEN_PROBLEM_FIRST` + `PITCH_SPEED`.

---

### 9.7 Real-Time In-Call Adaptation

Beyond learning between calls, the RL engine also adapts **within a single call** in real time:

**FR-90:** The agent maintains a **live engagement score** updated after every customer turn:

```python
engagement_score = (
    0.4 × sentiment_score      # positive sentiment = engaged
  + 0.3 × response_length      # longer responses = more engaged
  + 0.2 × question_rate        # asking questions = curious
  + 0.1 × name_usage           # using agent's name = rapport
)
# Score: 0.0 (disengaged) → 1.0 (highly engaged)
```

**FR-91:** Based on the live engagement score, the agent dynamically adjusts within the call:

| Engagement Score | Agent Behavior Shift |
|-----------------|----------------------|
| > 0.7 (High) | Continue current approach; deepen the pitch; move toward CTA |
| 0.4–0.7 (Medium) | Introduce a story or social proof to rebuild interest |
| 0.2–0.4 (Low) | Shorten pitch; shift to a question to re-engage customer |
| < 0.2 (Very Low) | Emergency pivot: "Can I ask what would make this more relevant for you?" |
| Declining fast | Prepare for graceful exit: offer WhatsApp follow-up, avoid hard close |

**FR-92:** Engagement score trajectory is logged turn-by-turn for every call. This creates a **heat map** of engagement across the call arc, visible in the Admin Dashboard — showing exactly which minute of the conversation typically loses or wins customers.

---

### 9.8 Hang-Up Analysis — Learning from Immediate Rejections

Early hang-ups (within 10–30 seconds) are the highest-signal failure events. The RL engine treats them with special attention:

**FR-93:** Every call that ends within 30 seconds triggers a **Hang-Up Autopsy**:

1. Extract the agent's exact opening utterance from the transcript
2. Extract audio features: pace, pitch, energy, first-word choice
3. Classify the opening into its strategy type (which of the 6 opening variants was used)
4. Log: language, time of day, lead source, opening strategy, hang-up timing
5. Increment the failure count for that (strategy × context) combination
6. If the failure count for a specific opening strategy in a specific context exceeds a threshold (configurable, default: 5 consecutive failures), the RL engine **suppresses that strategy for that context** and shifts probability mass to alternatives

**FR-94:** The Admin Dashboard shows a **Hang-Up Heatmap** — a visualization of when during the opening prospects are most likely to hang up, and which opening strategies have the highest early-exit rate. This is the fastest feedback loop in the system — a bad opening strategy can be identified and suppressed within 24 hours of deploying it.

**FR-95:** When the agent is updated with a new opening strategy (added manually by Admin or extracted from a human recording upload), its exploration weight starts at ε = 0.40 for that strategy — meaning the system actively tests it in 40% of relevant calls to quickly evaluate whether it outperforms existing strategies.

---

### 9.9 Integration with the Human Recording Learning Engine (Section 8)

The RL engine and the Human Recording Learning Engine are not separate — they feed into each other:

```
HUMAN RECORDINGS (Section 8)          LIVE RL CALLS (Section 9)
         │                                       │
         ▼                                       ▼
  Transcription &                       Post-call reward
  analysis pipeline                     calculation
         │                                       │
         ▼                                       ▼
  Extracted strategies,              Updated policy weights,
  power phrases, tone profile        action value estimates
         │                                       │
         └──────────────┬────────────────────────┘
                        ▼
               UNIFIED POLICY STORE
               (per Company Profile)
                        │
                        ▼
              Live Agent behavior
              on next call
```

**FR-96:** Human recordings provide the **cold-start prior** — they initialize the policy before the agent has made enough live calls to learn from scratch. Without them, the RL agent would spend its first few hundred calls in pure exploration (random-ish behavior). With a strong set of human recordings analyzed first, the agent starts from a high baseline and improves from there rather than from zero.

**FR-97:** As live call volume grows, the weight of human recording–derived priors gradually decreases and the weight of live RL experience increases. The transition is automatic, governed by a confidence threshold — when the live call dataset for a given context reaches N calls (default: 200), the RL-derived policy for that context takes full precedence over the human recording prior.

---

### 9.10 Policy Versioning & Rollback

**FR-98:** Every policy update creates a new **Policy Version** with a timestamp and a summary of what changed:

```
Policy v1.0   [2026-06-01]  Initialized from human recordings (47 sessions)
Policy v1.1   [2026-06-08]  RL update: OPEN_SOFT_INTRO suppressed for outbound Malayalam
                             (5 consecutive hang-ups in <10s). OPEN_PROBLEM_FIRST promoted.
Policy v1.2   [2026-06-15]  RL update: PITCH_PLACEMENT now ranked #1 for Tech School
                             outbound (Malayalam). Conversion rate: +12% vs v1.1
Policy v1.3   [2026-06-22]  RL update: CTA_BOOK_NOW win rate declining for evening calls.
                             CTA_CALLBACK promoted for t > 6PM.
```

**FR-99:** The Admin can view the full policy changelog in the Admin Dashboard, including before/after conversion rate comparison for each version.

**FR-100:** The Admin can **roll back** to any previous policy version with one click — useful if an RL update produced unexpected behavior or if a new campaign requires reverting to a known-good strategy.

**FR-101:** Policy versions are scoped per Company Profile. Rolling back Bridgeon's policy has no effect on any other company using the platform.

---

### 9.11 RL Performance Dashboard

The Admin Dashboard includes a dedicated **RL Performance** view showing:

| Metric | Display |
|--------|---------|
| Current policy version | Badge with last-updated timestamp |
| Conversion rate trend | Line chart: conversion % over last 30/60/90 days |
| Reward score trend | Rolling average reward per call over time |
| Opening strategy win rates | Bar chart: conversion % per strategy (current policy) |
| Pitch angle win rates | Bar chart: per pitch angle |
| Objection handle rates | Table: objection × response × win rate |
| Engagement score heatmap | Call timeline heatmap showing engagement rise/fall patterns |
| Hang-up heatmap | When in the call do hang-ups occur most? |
| Exploration rate (ε) | Current value with manual override control |
| Policy confidence | % of context segments with ≥200 calls (sufficient RL data) |
| Segments still cold-starting | Context combinations where human recording priors still dominate |

**FR-102:** All RL metrics are segmented by language, lead source, course interest, and time period — so the Admin can see not just overall improvement but exactly which segments are learning fastest.

---

### 9.12 Safeguards & Human Oversight

Autonomous RL systems can drift in unexpected directions. The following safeguards ensure the agent stays safe, ethical, and on-brand:

**FR-103: Hard Constraints (never overridden by RL)**
- The agent cannot learn to misrepresent course fees, placement rates, or certifications. All factual claims must still come from the verified knowledge base (RAG), even if the RL engine found that exaggerating increased short-term conversions.
- The agent cannot learn to be more aggressive or manipulative than a configurable "aggressiveness cap" set by the Admin (scale 1–5; default 3).
- TRAI-compliant calling hours are enforced at the infrastructure level — RL cannot schedule calls outside them regardless of what it learns.
- The agent cannot learn to refuse escalation requests. If a customer asks for a human, the agent must comply.

**FR-104: Reward Shaping Guardrails**
- If the RL engine discovers a strategy that dramatically increases early conversions but also dramatically increases complaints or opt-outs, the complaint penalty outweighs the conversion reward (complaint weight = -0.80). The system will self-correct.
- A **guardrail classifier** runs on every agent turn before it is spoken. If the proposed utterance is flagged as misleading, high-pressure, or off-brand, it is replaced with a safe fallback response and the RL engine receives a -0.20 penalty for producing it.

**FR-105: Admin Notification on Policy Drift**
- If the policy changes significantly in a single update cycle (>15% shift in any action weight), the Admin receives an email/dashboard notification: "Significant policy update detected — review recommended."
- If conversion rate drops by >10% week-over-week, an alert fires and the system pauses RL updates pending Admin review.

**FR-106: A/B Policy Testing**
- Before rolling a new policy version to 100% of calls, the Admin can run an **A/B test**: send 20% of calls to the new policy, 80% to the current policy, and compare metrics over a configurable duration (default: 72 hours or 100 calls, whichever comes first). The winning policy is then promoted to 100%.

---
| OQ-2 | Should the widget support video in the future? | Out of scope for V1; flagged for V2 |
| OQ-3 | TRAI DND integration — self-hosted or third-party? | Use third-party DND scrubbing API (e.g., TrueCallerAPI or Servetel) |
| OQ-4 | Should call recordings be accessible to the prospect? | Requires legal review; default: No |
| OQ-5 | Google Sheets vs internal DB as source of truth? | Internal DB is source of truth; Sheets is a read-only sync |
| OQ-6 | Sarvam AI rate limits for Malayalam TTS at scale? | Must confirm with Sarvam AI for 500 concurrent TTS streams |
| OQ-7 | CRM integration (Zoho / Salesforce) needed for V1? | Out of scope V1; webhook is the integration bridge |
| OQ-8 | How does the agent handle profanity or abusive callers? | Agent warns once, then disconnects after second offense |

---

## 18. Glossary

| Term | Definition |
|------|------------|
| STT | Speech-to-Text — converts spoken audio to text |
| TTS | Text-to-Speech — converts text to spoken audio |
| RAG | Retrieval-Augmented Generation — LLM answers grounded in retrieved documents |
| LLM | Large Language Model (e.g., Claude, GPT-4o) |
| WER | Word Error Rate — metric for STT accuracy |
| TRAI | Telecom Regulatory Authority of India |
| DND | Do Not Disturb — TRAI-regulated list of numbers that cannot receive promotional calls |
| WebRTC | Web Real-Time Communication — browser API for audio/video |
| Warm Transfer | Call transfer where the bot briefs the human agent before bridging the caller |
| KB | Knowledge Base — the indexed company content used for RAG retrieval |
| DPDP | Digital Personal Data Protection Act, India (2023) |
| Sarvam AI | Indian AI company specializing in Indian language ASR and TTS models |
| ExoML | Exotel Markup Language — XML-like syntax to control call flow |
| pgvector | PostgreSQL extension for vector similarity search |
| CSAT | Customer Satisfaction Score |
| SIP | Session Initiation Protocol — used for VoIP call routing |
| Speaker Diarization | Automatically identifying and separating individual speakers in a recording |
| Prosody | The rhythm, stress, pace, and intonation patterns of spoken language |
| Power Phrase | A word or phrase statistically associated with positive call outcomes, extracted from top-performing recordings |
| Drop Phrase | A word or phrase statistically associated with call drops or negative outcomes; the agent avoids these |
| Tone Profile | A set of audio feature parameters (pitch, rate, energy) derived from top-rated human recordings and used to guide TTS voice style |
| Objection Playbook | A ranked library of customer objections paired with the statistically best agent responses, auto-built from recording analysis |
| Conversation Arc | The structured phases of a sales call: Opening → Discovery → Pitch → Objection Handling → Close |
| Learning Studio | The Admin Dashboard section for uploading recordings, reviewing transcripts, and managing the learning pipeline |
| Learning Set | A named collection of uploaded recordings grouped by theme or quality for targeted learning |
| Resonance Moment | A point in a conversation where a specific agent phrase caused a measurable positive shift in customer sentiment |
| F0 / Fundamental Frequency | The base pitch of a speaker's voice, used in prosody analysis |
| SSML | Speech Synthesis Markup Language — markup used to control TTS voice style parameters |
| Reinforcement Learning (RL) | A machine learning paradigm where an agent learns optimal behavior by receiving rewards or penalties based on the outcomes of its actions |
| Markov Decision Process (MDP) | A mathematical framework for modeling sequential decision-making; the formal basis for the RL system |
| Reward Signal | A numerical score given to the agent after an action or episode, indicating how well it performed |
| Policy | The agent's learned strategy — a mapping from states (conversation context) to actions (what to say next) |
| Policy Version | A snapshot of the agent's strategy at a point in time; versioned for auditability and rollback |
| ε-Greedy Exploration | An RL strategy that chooses a random action with probability ε (to discover new strategies) and the best-known action otherwise |
| Contextual Bandit | An RL approach where separate policies are learned for different contexts (e.g., language, lead source, time of day) |
| Temporal Difference (TD) | An RL credit-assignment method that back-propagates rewards across the sequence of turns that led to an outcome |
| Engagement Score | A real-time composite metric (0.0–1.0) measuring how interested and involved a customer is during a call |
| Hang-Up Autopsy | An automatic analysis triggered when a call ends within 30 seconds, to identify which opening strategy failed and why |
| Cold-Start Prior | Initial policy values seeded from human recording analysis, used before the agent has accumulated enough live call data to learn independently |
| Action Space | The complete set of decisions the RL agent can make: opening strategy, pitch angle, tone parameters, CTA variant, objection response |
| Reward Shaping | The process of designing the reward function to guide the agent toward desired behavior, including penalties for unethical or off-brand actions |
| A/B Policy Testing | Running two policy versions simultaneously on a split of live calls to compare performance before committing to one |
| Aggressiveness Cap | An Admin-configurable limit on how assertive the agent's sales tactics can become, preventing RL from learning manipulative behavior |
| Guardrail Classifier | A safety model that evaluates every agent utterance before it is spoken and blocks or replaces content that is misleading or off-brand |

---

*This PRD is intended as the single source of truth for the AI Telecaller Agent project. All implementation decisions should reference this document. For questions or amendments, contact the Product Owner.*

**Document Version History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | June 2026 | Claude (AI) | Initial draft |
| 1.1 | June 2026 | Claude (AI) | Added Section 7: Zero-Interference Widget Integration & Autonomous Website Sync |
| 1.2 | June 2026 | Claude (AI) | Added Section 8: Human Recording Upload & Conversational Learning Engine — covering upload interface, transcription pipeline, tone/prosody analysis, phrase mining, objection playbook, positive/negative learning modes, continuous self-improvement loop, and privacy requirements |
| 1.3 | June 2026 | Claude (AI) | Added Section 9: Reinforcement Learning Engine — Autonomous Self-Improvement — covering MDP framing, composite reward signal design (outcome + micro + efficiency rewards), action space definition (6 opening strategies, pitch angles, tone parameters, CTA variants), ε-greedy exploration with decay, contextual bandit per-segment specialization, real-time in-call engagement adaptation, hang-up autopsy, integration with human recording engine, policy versioning & rollback, RL performance dashboard, and safeguards including guardrail classifier and A/B policy testing |
