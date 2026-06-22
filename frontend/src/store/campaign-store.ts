import { create } from "zustand";

import { createCampaign, fetchCampaigns, updateCampaignStatus } from "@/lib/api";
import type { Campaign, CampaignStatus, NewCampaignInput } from "@/lib/types";

export type { NewCampaignInput };

const initialCampaigns: Campaign[] = [
  {
    id: "bridgeon-mern-leads-june",
    name: "MERN Stack Cohort - June Outreach",
    companyId: "bridgeon-skillversity",
    status: "active",
    callingWindowStart: "10:00",
    callingWindowEnd: "18:00",
    timeZone: "Asia/Kolkata",
    maxRetries: 3,
    retryIntervalMinutes: 15,
    leads: [
      {
        id: "seed-lead-1",
        name: "Anjali Menon",
        phoneNumber: "+91 98470 00001",
        languagePreference: "Malayalam",
        interestTag: "MERN Stack",
        status: "answered",
        callAttempts: 1,
        lastCallAt: null,
      },
      {
        id: "seed-lead-2",
        name: "Rahul Nair",
        phoneNumber: "+91 98470 00002",
        languagePreference: "Malayalam",
        interestTag: "Data Science",
        status: "busy",
        callAttempts: 1,
        lastCallAt: null,
      },
      {
        id: "seed-lead-3",
        name: "Sandra Thomas",
        phoneNumber: "+91 98470 00003",
        languagePreference: "English",
        interestTag: "MERN Stack",
        status: "failed",
        callAttempts: 2,
        lastCallAt: null,
      },
      {
        id: "seed-lead-4",
        name: "Vishnu Prasad",
        phoneNumber: "+91 98470 00004",
        languagePreference: "Malayalam",
        interestTag: "UI/UX Design",
        status: "not_contacted",
        callAttempts: 0,
        lastCallAt: null,
      },
      {
        id: "seed-lead-5",
        name: "Divya Pillai",
        phoneNumber: "+91 98470 00005",
        languagePreference: "English",
        interestTag: "Data Science",
        status: "not_contacted",
        callAttempts: 0,
        lastCallAt: null,
      },
    ],
    createdAt: "2026-06-12T09:00:00.000Z",
    updatedAt: "2026-06-12T09:00:00.000Z",
  },
];

interface CampaignState {
  campaigns: Campaign[];
  isLoading: boolean;
  error: string | null;
  loadCampaigns: () => Promise<void>;
  addCampaign: (input: NewCampaignInput) => Promise<Campaign>;
  setCampaignStatus: (campaignId: string, status: CampaignStatus) => Promise<void>;
}

export const useCampaignStore = create<CampaignState>((set) => ({
  campaigns: initialCampaigns,
  isLoading: false,
  error: null,

  loadCampaigns: async () => {
    set({ isLoading: true, error: null });
    try {
      const campaigns = await fetchCampaigns();
      set({ campaigns, isLoading: false });
    } catch {
      set({
        isLoading: false,
        error: "Could not reach the backend. Showing local data only.",
      });
    }
  },

  addCampaign: async (input) => {
    const campaign = await createCampaign(input);
    set((state) => ({ campaigns: [campaign, ...state.campaigns] }));
    return campaign;
  },

  setCampaignStatus: async (campaignId, status) => {
    const campaign = await updateCampaignStatus(campaignId, status);
    set((state) => ({
      campaigns: state.campaigns.map((existing) =>
        existing.id === campaignId ? campaign : existing
      ),
    }));
  },
}));
