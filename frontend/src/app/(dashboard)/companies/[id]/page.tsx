"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  History,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import {
  CRAWL_STATUS_LABEL,
  CRAWL_STATUS_VARIANT,
  getHostname,
} from "@/components/companies/company-card";
import { KnowledgeChunkDialog } from "@/components/companies/knowledge-chunk-dialog";
import { TelephonyPanel } from "@/components/companies/telephony-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchObserverLogs, fetchSyncLogs, searchKnowledge } from "@/lib/api";
import {
  LANGUAGE_OPTIONS,
  TONE_OPTIONS,
  type KnowledgeChunk,
  type KnowledgeSearchResult,
  type ObserverLog,
  type SyncLogEntry,
} from "@/lib/types";
import { useCompanyStore } from "@/store/company-store";
import { useKnowledgeStore } from "@/store/knowledge-store";

// Stable reference so the Zustand selector below doesn't return a new array
// on every call when no chunks have loaded yet for this company.
const EMPTY_CHUNKS: KnowledgeChunk[] = [];

export default function CompanyKnowledgeBasePage() {
  const params = useParams<{ id: string }>();
  const companyId = params.id;

  const companies = useCompanyStore((state) => state.companies);
  const isLoadingCompanies = useCompanyStore((state) => state.isLoading);
  const loadCompanies = useCompanyStore((state) => state.loadCompanies);
  const crawlCompany = useCompanyStore((state) => state.crawlCompany);

  const company = companies.find((c) => c.id === companyId);

  const chunks = useKnowledgeStore(
    (state) => state.chunksByCompany[companyId] ?? EMPTY_CHUNKS
  );
  const isLoadingChunks = useKnowledgeStore((state) =>
    state.loadingCompanyIds.has(companyId)
  );
  const loadChunks = useKnowledgeStore((state) => state.loadChunks);
  const removeChunk = useKnowledgeStore((state) => state.removeChunk);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KnowledgeSearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [deletingChunkId, setDeletingChunkId] = useState<string | null>(null);
  const [observerLogs, setObserverLogs] = useState<ObserverLog[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const chunk of chunks) {
      for (const tag of chunk.tags) {
        tags.add(tag);
      }
    }
    return Array.from(tags).sort();
  }, [chunks]);

  const visibleChunks = useMemo(() => {
    if (!activeTag) return chunks;
    return chunks.filter((chunk) => chunk.tags.includes(activeTag));
  }, [chunks, activeTag]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    loadChunks(companyId);
  }, [companyId, loadChunks]);

  useEffect(() => {
    if (company?.crawlStatus === "completed") {
      loadChunks(companyId);
    }
  }, [company?.crawlStatus, companyId, loadChunks]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await fetchObserverLogs(companyId);
        if (!cancelled) setObserverLogs(data);
      } catch {
        // Ignore transient polling errors; retry on the next tick.
      }
    }

    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [companyId]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await fetchSyncLogs(companyId);
        if (!cancelled) setSyncLogs(data);
      } catch {
        // Ignore transient polling errors; retry on the next tick.
      }
    }

    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [companyId]);

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const data = await searchKnowledge(companyId, query, 5);
      setResults(data);
    } catch {
      setSearchError("Search failed. Is the backend running?");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleDelete(chunkId: string) {
    if (!window.confirm("Delete this knowledge chunk?")) return;

    setDeletingChunkId(chunkId);
    try {
      await removeChunk(companyId, chunkId);
    } finally {
      setDeletingChunkId(null);
    }
  }

  if (!company) {
    return (
      <div className="space-y-6">
        <Link
          href="/companies"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to companies
        </Link>
        <p className="text-sm text-muted-foreground">
          {isLoadingCompanies ? "Loading company…" : "Company not found."}
        </p>
      </div>
    );
  }

  const isCrawling =
    company.crawlStatus === "queued" || company.crawlStatus === "crawling";

  const toneLabel =
    TONE_OPTIONS.find((option) => option.value === company.tone)?.label ??
    company.tone;
  const languageLabel =
    LANGUAGE_OPTIONS.find((option) => option.value === company.primaryLanguage)
      ?.label ?? company.primaryLanguage;

  return (
    <div className="space-y-6">
      <Link
        href="/companies"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to companies
      </Link>

      <PageHeader
        title={company.name}
        description={`Knowledge base for ${getHostname(company.websiteUrl)}`}
        actions={
          <Button
            type="button"
            variant="outline"
            disabled={isCrawling}
            onClick={() => crawlCompany(company.id)}
          >
            <RefreshCw className={isCrawling ? "animate-spin" : undefined} />
            Sync Now
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={CRAWL_STATUS_VARIANT[company.crawlStatus]}>
          {isCrawling && <Loader2 className="size-3 animate-spin" />}
          {CRAWL_STATUS_LABEL[company.crawlStatus]}
        </Badge>
        <Badge variant="secondary">{toneLabel} tone</Badge>
        <Badge variant="outline">{languageLabel}</Badge>
        <Badge variant="outline">{company.pagesIndexed} pages indexed</Badge>
        <Badge variant="outline">{chunks.length} chunks indexed</Badge>
      </div>

      <TelephonyPanel companyId={companyId} agentName={company.agentName} />

      <Card>
        <CardHeader>
          <CardTitle>Search the knowledge base</CardTitle>
          <CardDescription>
            Try a question like &ldquo;MERN Stack fees&rdquo; or &ldquo;Bridgeon
            location&rdquo; to retrieve the most relevant chunks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ask a question about this company's website…"
            />
            <Button type="submit" disabled={isSearching || !query.trim()}>
              {isSearching ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Search />
              )}
              Search
            </Button>
          </form>

          {searchError && (
            <p className="text-sm text-destructive">{searchError}</p>
          )}

          {results !== null &&
            (results.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No matching chunks found.
              </p>
            ) : (
              <ul className="space-y-3">
                {results.map((result) => (
                  <li key={result.chunk.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {result.chunk.sourceTitle}
                      </p>
                      <Badge variant="secondary">
                        {(result.score * 100).toFixed(1)}% match
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {result.chunk.sourceUrl}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {result.chunk.text}
                    </p>
                  </li>
                ))}
              </ul>
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>FAQ &amp; Knowledge Chunk Editor</CardTitle>
          <CardDescription>
            {isLoadingChunks
              ? "Loading chunks…"
              : `${chunks.length} chunk(s) indexed from ${company.pagesIndexed} page(s).`}
          </CardDescription>
          <CardAction>
            <KnowledgeChunkDialog
              companyId={companyId}
              trigger={
                <Button type="button" size="sm">
                  <Plus />
                  Add Custom Chunk
                </Button>
              }
            />
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-3">
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={activeTag === null ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setActiveTag(null)}
              >
                All
              </Badge>
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={activeTag === tag ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {!isLoadingChunks && chunks.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No content indexed yet. Click &ldquo;Sync Now&rdquo; to crawl the
              website, or &ldquo;Add Custom Chunk&rdquo; to add an entry manually.
            </p>
          )}
          {!isLoadingChunks && chunks.length > 0 && visibleChunks.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No chunks match the selected tag.
            </p>
          )}
          {visibleChunks.length > 0 && (
            <ul className="max-h-[480px] space-y-2 overflow-y-auto">
              {visibleChunks.map((chunk) => (
                <li
                  key={chunk.id}
                  className="rounded-md border bg-muted/30 p-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{chunk.sourceTitle}</p>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge variant="outline">{chunk.charCount} chars</Badge>
                      <Badge
                        variant={
                          chunk.sourceType === "manual" ? "secondary" : "outline"
                        }
                      >
                        {chunk.sourceType === "manual" ? "Manual" : "Crawled"}
                      </Badge>
                      <KnowledgeChunkDialog
                        companyId={companyId}
                        chunk={chunk}
                        trigger={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Edit chunk"
                          >
                            <Pencil />
                          </Button>
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Delete chunk"
                        disabled={deletingChunkId === chunk.id}
                        onClick={() => handleDelete(chunk.id)}
                      >
                        {deletingChunkId === chunk.id ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Trash2 />
                        )}
                      </Button>
                    </div>
                  </div>
                  {chunk.sourceUrl && (
                    <p className="truncate text-xs text-muted-foreground">
                      {chunk.sourceUrl}
                    </p>
                  )}
                  <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                    {chunk.text}
                  </p>
                  {chunk.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {chunk.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync Log</CardTitle>
          <CardDescription>
            Results of the diff-based auto-sync engine: which crawled pages
            changed and how the vector store was surgically updated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {syncLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sync runs yet. Click &ldquo;Sync Now&rdquo; above to crawl
              the website and build the initial knowledge base.
            </p>
          ) : (
            <ul className="max-h-[360px] space-y-2 overflow-y-auto">
              {syncLogs.map((log) => (
                <li
                  key={log.id}
                  className="rounded-md border bg-muted/30 p-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 font-medium">
                      <History className="size-3.5 shrink-0 text-primary" />
                      {log.summary}
                    </p>
                    <Badge variant="outline" className="shrink-0">
                      {new Date(log.triggeredAt).toLocaleTimeString()}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Checked {log.pagesChecked} page(s).
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dynamic Observer Logs</CardTitle>
          <CardDescription>
            Content-change signals reported by the embedded widget&apos;s
            page observer, in real time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {observerLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No content-change signals received yet. Open a page with the
              embedded widget to start streaming observer logs.
            </p>
          ) : (
            <ul className="max-h-[360px] space-y-2 overflow-y-auto">
              {observerLogs.map((log) => (
                <li
                  key={log.id}
                  className="rounded-md border bg-muted/30 p-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 truncate font-medium">
                      <Activity className="size-3.5 shrink-0 text-primary" />
                      {log.url}
                    </p>
                    <Badge variant="outline" className="shrink-0">
                      {new Date(log.receivedAt).toLocaleTimeString()}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    Content hash: {log.contentHash}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Next sync queued for{" "}
                    {new Date(log.syncQueuedAt).toLocaleTimeString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
