"use client";

import { useEffect } from "react";

import { CampaignCard } from "@/components/campaigns/campaign-card";
import { CreateCampaignDialog } from "@/components/campaigns/create-campaign-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { useCampaignStore } from "@/store/campaign-store";
import { useCompanyStore } from "@/store/company-store";

export default function CampaignsPage() {
  const campaigns = useCampaignStore((state) => state.campaigns);
  const campaignsError = useCampaignStore((state) => state.error);
  const loadCampaigns = useCampaignStore((state) => state.loadCampaigns);
  const loadCompanies = useCompanyStore((state) => state.loadCompanies);

  useEffect(() => {
    loadCampaigns();
    loadCompanies();
  }, [loadCampaigns, loadCompanies]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="Outbound calling campaigns, lead lists, and retry rules."
        actions={<CreateCampaignDialog />}
      />

      {campaignsError && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {campaignsError}
        </p>
      )}

      {campaigns.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No campaigns yet. Click &ldquo;New Campaign&rdquo; to upload a lead
          list and get started.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}
