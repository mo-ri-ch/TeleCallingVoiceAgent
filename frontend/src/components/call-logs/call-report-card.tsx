"use client";

import { useState } from "react";
import { Building2, ChevronDown, ChevronUp, Clock, Timer, TrendingUp } from "lucide-react";

import { Badge, type badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CallOutcome, CallReport, CallSentiment, ConversationPhase, SheetSyncStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCompanyStore } from "@/store/company-store";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export const SENTIMENT_LABEL: Record<CallSentiment, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

export const SENTIMENT_VARIANT: Record<CallSentiment, BadgeVariant> = {
  positive: "success",
  neutral: "outline",
  negative: "destructive",
};

export const OUTCOME_LABEL: Record<CallOutcome, string> = {
  interested: "Interested",
  callback: "Callback",
  escalated: "Escalated",
  not_interested: "Not Interested",
};

export const OUTCOME_VARIANT: Record<CallOutcome, BadgeVariant> = {
  interested: "success",
  callback: "warning",
  escalated: "destructive",
  not_interested: "secondary",
};

export const SHEET_SYNC_LABEL: Record<SheetSyncStatus, string> = {
  pending: "Sheet Sync Pending",
  synced: "Synced to Sheet",
  skipped: "Sheet Sync Skipped",
  failed: "Sheet Sync Failed",
};

export const SHEET_SYNC_VARIANT: Record<SheetSyncStatus, BadgeVariant> = {
  pending: "outline",
  synced: "success",
  skipped: "secondary",
  failed: "destructive",
};

const PHASE_LABEL: Record<ConversationPhase, string> = {
  opening: "Opening",
  discovery: "Discovery",
  pitch: "Pitch",
  objections: "Objections",
  closing: "Closing",
};

const PHASE_COLOR: Record<ConversationPhase, string> = {
  opening: "bg-blue-400",
  discovery: "bg-purple-400",
  pitch: "bg-amber-400",
  objections: "bg-red-400",
  closing: "bg-green-400",
};

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function rewardColor(score: number): string {
  if (score >= 0.5) return "text-success";
  if (score >= 0) return "text-warning";
  return "text-destructive";
}

export function CallReportCard({ report }: { report: CallReport }) {
  const companies = useCompanyStore((state) => state.companies);
  const company = companies.find((c) => c.id === report.companyId);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showRL, setShowRL] = useState(false);

  const startedAt = new Date(report.startedAt);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">
              {report.fromNumber} &rarr; {report.toNumber}
            </CardTitle>
            <CardDescription className="flex items-center gap-1.5">
              <Building2 className="size-3.5" />
              {company?.name ?? report.companyId}
            </CardDescription>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            <Badge variant={SENTIMENT_VARIANT[report.sentiment]}>
              {SENTIMENT_LABEL[report.sentiment]}
            </Badge>
            <Badge variant={OUTCOME_VARIANT[report.outcome]}>
              {OUTCOME_LABEL[report.outcome]}
            </Badge>
            <Badge variant={SHEET_SYNC_VARIANT[report.sheetSyncStatus]}>
              {SHEET_SYNC_LABEL[report.sheetSyncStatus]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="size-4 shrink-0" />
            {startedAt.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
          </span>
          <span className="flex items-center gap-1.5">
            <Timer className="size-4 shrink-0" />
            {formatDuration(report.durationSeconds)}
          </span>
          {/* Phase 23: Reward score */}
          {(report.rewardScore !== undefined && report.rewardScore !== 0) && (
            <span className={cn("flex items-center gap-1.5 font-medium", rewardColor(report.rewardScore))}>
              <TrendingUp className="size-4 shrink-0" />
              Reward: {report.rewardScore > 0 ? "+" : ""}{report.rewardScore.toFixed(2)}
            </span>
          )}
        </div>

        {/* Recording */}
        {report.recordingUrl ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio controls className="w-full" src={report.recordingUrl} />
        ) : (
          <p className="text-sm text-muted-foreground">No recording available for this call.</p>
        )}

        {/* AI Summary */}
        <div className="space-y-1">
          <p className="text-sm font-medium">AI Summary</p>
          <div className="space-y-0.5 text-sm text-muted-foreground">
            {report.summary.split("\n").map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </div>

        {/* RL Panel: MDP states + engagement + reward breakdown */}
        {(report.mdpStates.length > 0 || report.engagementScores.length > 0) && (
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowRL((prev) => !prev)}
            >
              {showRL ? <ChevronUp /> : <ChevronDown />}
              {showRL ? "Hide RL Analysis" : "RL Analysis"}
            </Button>
            {showRL && (
              <div className="mt-3 space-y-4">
                {/* MDP state timeline (Phase 22) */}
                {report.mdpStates.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Conversation Phase Timeline
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {report.mdpStates.map((s, i) => (
                        <div key={i} className="flex items-center gap-1 text-xs">
                          <span
                            className={cn(
                              "inline-block size-2.5 rounded-full",
                              PHASE_COLOR[s.phase],
                            )}
                          />
                          <span>T{s.turnIndex + 1}: {PHASE_LABEL[s.phase]}</span>
                          <span className="text-muted-foreground/70">({s.customerSentiment})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Engagement graph (Phase 26) */}
                {report.engagementScores.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Customer Engagement
                    </p>
                    <div className="flex items-end gap-1.5 h-10">
                      {report.engagementScores.map((e, i) => (
                        <div key={i} className="flex flex-col items-center gap-0.5">
                          <div
                            title={`Turn ${e.turnIndex + 1}: ${(e.score * 100).toFixed(0)}%`}
                            className={cn(
                              "w-6 rounded-sm transition-all",
                              e.score >= 0.6 ? "bg-success" : e.score >= 0.4 ? "bg-warning" : "bg-destructive",
                            )}
                            style={{ height: `${Math.max(e.score * 40, 4)}px` }}
                          />
                          <span className="text-[10px] text-muted-foreground">T{e.turnIndex + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reward breakdown (Phase 23) */}
                {report.rewardBreakdown && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Reward Breakdown
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 rounded-md border bg-muted/30 px-3 py-2 text-xs">
                      <span className="text-muted-foreground">Outcome</span>
                      <span className={cn("font-medium", rewardColor(report.rewardBreakdown.outcomeReward))}>
                        {report.rewardBreakdown.outcomeReward > 0 ? "+" : ""}
                        {report.rewardBreakdown.outcomeReward.toFixed(3)}
                      </span>
                      <span className="text-muted-foreground">Micro-rewards</span>
                      <span className={cn("font-medium", rewardColor(report.rewardBreakdown.microRewards))}>
                        {report.rewardBreakdown.microRewards > 0 ? "+" : ""}
                        {report.rewardBreakdown.microRewards.toFixed(3)}
                      </span>
                      {report.rewardBreakdown.efficiencyPenalty !== 0 && (
                        <>
                          <span className="text-muted-foreground">Efficiency</span>
                          <span className="font-medium text-destructive">
                            {report.rewardBreakdown.efficiencyPenalty.toFixed(3)}
                          </span>
                        </>
                      )}
                      <span className="font-semibold text-foreground border-t pt-0.5 mt-0.5">Total</span>
                      <span className={cn("font-semibold border-t pt-0.5 mt-0.5", rewardColor(report.rewardBreakdown.total))}>
                        {report.rewardBreakdown.total > 0 ? "+" : ""}
                        {report.rewardBreakdown.total.toFixed(3)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Transcript */}
        {report.turns.length > 0 && (
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowTranscript((prev) => !prev)}
            >
              {showTranscript ? <ChevronUp /> : <ChevronDown />}
              {showTranscript ? "Hide Transcript" : "Show Transcript"}
            </Button>
            {showTranscript && (
              <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-md border bg-muted/30 p-2 text-sm">
                {report.turns.map((turn, index) => (
                  <li key={index}>
                    <span className="font-medium">
                      {turn.role === "agent" ? "Agent" : "Caller"}:
                    </span>{" "}
                    <span className="text-muted-foreground">{turn.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
