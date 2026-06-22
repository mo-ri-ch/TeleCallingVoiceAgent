"use client";

import Link from "next/link";
import { Bot, Database, ExternalLink, Globe, Loader2, Phone, RefreshCw } from "lucide-react";

import { Badge, type badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LANGUAGE_OPTIONS,
  TONE_OPTIONS,
  type CompanyProfile,
  type CrawlStatus,
} from "@/lib/types";
import { useCompanyStore } from "@/store/company-store";
import type { VariantProps } from "class-variance-authority";

export const CRAWL_STATUS_LABEL: Record<CrawlStatus, string> = {
  not_started: "Not crawled yet",
  queued: "Queued",
  crawling: "Crawling…",
  completed: "Indexed",
  failed: "Crawl failed",
};

export const CRAWL_STATUS_VARIANT: Record<
  CrawlStatus,
  NonNullable<VariantProps<typeof badgeVariants>["variant"]>
> = {
  not_started: "outline",
  queued: "warning",
  crawling: "warning",
  completed: "success",
  failed: "destructive",
};

export function getHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function CompanyCard({ company }: { company: CompanyProfile }) {
  const crawlCompany = useCompanyStore((state) => state.crawlCompany);

  const toneLabel =
    TONE_OPTIONS.find((option) => option.value === company.tone)?.label ??
    company.tone;
  const languageLabel =
    LANGUAGE_OPTIONS.find((option) => option.value === company.primaryLanguage)
      ?.label ?? company.primaryLanguage;

  const isCrawling =
    company.crawlStatus === "queued" || company.crawlStatus === "crawling";

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">{company.name}</CardTitle>
            <CardDescription>
              <a
                href={company.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-primary hover:underline"
              >
                {getHostname(company.websiteUrl)}
                <ExternalLink className="size-3" />
              </a>
            </CardDescription>
          </div>
          <Badge variant={CRAWL_STATUS_VARIANT[company.crawlStatus]}>
            {isCrawling && <Loader2 className="size-3 animate-spin" />}
            {CRAWL_STATUS_LABEL[company.crawlStatus]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{toneLabel} tone</Badge>
          <Badge variant="outline">{languageLabel}</Badge>
        </div>
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Bot className="size-4 shrink-0" />
            <span>
              Agent:{" "}
              <span className="font-medium text-foreground">
                {company.agentName}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="size-4 shrink-0" />
            <span className="truncate">
              {company.escalationNumbers.length > 0
                ? company.escalationNumbers.join(", ")
                : "No escalation numbers configured"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="size-4 shrink-0" />
            <span>{company.pagesIndexed} pages indexed</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <span className="text-xs text-muted-foreground">
            {isCrawling
              ? "Crawling website for knowledge base…"
              : "Sync the website to refresh the knowledge base."}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href={`/companies/${company.id}`}>
                <Database />
                Knowledge Base
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isCrawling}
              onClick={() => crawlCompany(company.id)}
            >
              <RefreshCw className={isCrawling ? "animate-spin" : undefined} />
              Sync Now
            </Button>
          </div>
        </div>

        {company.crawledPages.length > 0 && (
          <details className="rounded-md border bg-muted/30 p-2 text-sm">
            <summary className="cursor-pointer font-medium">
              Crawled pages ({company.crawledPages.length})
            </summary>
            <ul className="mt-2 space-y-2">
              {company.crawledPages.map((page) => (
                <li key={page.url} className="border-t pt-2 first:border-t-0 first:pt-0">
                  <p className="truncate font-medium">{page.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{page.url}</p>
                  {page.metaDescription && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {page.metaDescription}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {page.textLength.toLocaleString()} characters
                  </p>
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
