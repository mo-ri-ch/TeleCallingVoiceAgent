"use client";

import { useState } from "react";
import { Building2, Clock, Pause, Phone, PhoneCall, Play, Users } from "lucide-react";

import { Badge, type badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Campaign, CampaignLead, CampaignStatus, LeadStatus } from "@/lib/types";
import { useCampaignStore } from "@/store/campaign-store";
import { useCompanyStore } from "@/store/company-store";
import type { VariantProps } from "class-variance-authority";

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

export const CAMPAIGN_STATUS_VARIANT: Record<
  CampaignStatus,
  NonNullable<VariantProps<typeof badgeVariants>["variant"]>
> = {
  draft: "outline",
  active: "success",
  paused: "warning",
  completed: "secondary",
};

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  not_contacted: "Pending",
  busy: "Busy",
  answered: "Answered",
  failed: "Failed",
};

export const LEAD_STATUS_VARIANT: Record<
  LeadStatus,
  NonNullable<VariantProps<typeof badgeVariants>["variant"]>
> = {
  not_contacted: "outline",
  busy: "warning",
  answered: "success",
  failed: "destructive",
};

function retryInfo(lead: CampaignLead, campaign: Campaign): string | null {
  if (lead.status !== "busy" && lead.status !== "failed") return null;
  if (lead.callAttempts >= campaign.maxRetries) {
    return "Max retries reached";
  }

  const nextAttempt = lead.callAttempts + 1;
  if (!lead.lastCallAt) {
    return `Retry ${nextAttempt}/${campaign.maxRetries} queued`;
  }

  const nextRetryAt = new Date(lead.lastCallAt).getTime() + campaign.retryIntervalMinutes * 60_000;
  const time = new Date(nextRetryAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Retry ${nextAttempt}/${campaign.maxRetries} scheduled for ${time}`;
}

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const companies = useCompanyStore((state) => state.companies);
  const setCampaignStatus = useCampaignStore((state) => state.setCampaignStatus);
  const company = companies.find((c) => c.id === campaign.companyId);

  const [isUpdating, setIsUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const total = campaign.leads.length;
  const callsMade = campaign.leads.filter(
    (lead) => lead.status !== "not_contacted"
  ).length;
  const progress = total > 0 ? Math.round((callsMade / total) * 100) : 0;

  async function handleToggleStatus() {
    const nextStatus: CampaignStatus = campaign.status === "active" ? "paused" : "active";
    setIsUpdating(true);
    setStatusError(null);
    try {
      await setCampaignStatus(campaign.id, nextStatus);
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : "Could not update the campaign status."
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">{campaign.name}</CardTitle>
            <CardDescription className="flex items-center gap-1.5">
              <Building2 className="size-3.5" />
              {company?.name ?? campaign.companyId}
            </CardDescription>
          </div>
          <Badge variant={CAMPAIGN_STATUS_VARIANT[campaign.status]}>
            {CAMPAIGN_STATUS_LABEL[campaign.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="size-4 shrink-0" />
            {campaign.callingWindowStart} - {campaign.callingWindowEnd} (
            {campaign.timeZone})
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="size-4 shrink-0" />
            {total} {total === 1 ? "lead" : "leads"}
          </span>
          <span className="flex items-center gap-1.5">
            <Phone className="size-4 shrink-0" />
            Up to {campaign.maxRetries} {campaign.maxRetries === 1 ? "retry" : "retries"} every{" "}
            {campaign.retryIntervalMinutes}m
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {callsMade}/{total} Calls Made
            </span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {campaign.leads.map((lead) => {
            const retry = retryInfo(lead, campaign);
            return (
              <li
                key={lead.id}
                className="rounded-md border bg-muted/30 p-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 truncate font-medium">
                    <PhoneCall className="size-3.5 shrink-0 text-primary" />
                    {lead.name || "Unnamed lead"}
                  </p>
                  <Badge variant={LEAD_STATUS_VARIANT[lead.status]}>
                    {LEAD_STATUS_LABEL[lead.status]}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{lead.phoneNumber}</span>
                  {lead.languagePreference && <span>{lead.languagePreference}</span>}
                  {lead.interestTag && <span>{lead.interestTag}</span>}
                  {lead.callAttempts > 0 && (
                    <span>
                      {lead.callAttempts}{" "}
                      {lead.callAttempts === 1 ? "attempt" : "attempts"}
                    </span>
                  )}
                </div>
                {retry && (
                  <p className="mt-1 text-xs text-muted-foreground">{retry}</p>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2">
        {statusError && <p className="text-sm text-destructive">{statusError}</p>}
        {campaign.status === "completed" ? (
          <p className="text-center text-sm text-muted-foreground">
            Campaign completed -- every lead has answered or used all retries.
          </p>
        ) : (
          <Button
            className="w-full"
            variant={campaign.status === "active" ? "outline" : "default"}
            onClick={handleToggleStatus}
            disabled={isUpdating}
          >
            {campaign.status === "active" ? (
              <>
                <Pause /> {isUpdating ? "Pausing…" : "Pause Campaign"}
              </>
            ) : (
              <>
                <Play /> {isUpdating ? "Starting…" : "Start Campaign"}
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
