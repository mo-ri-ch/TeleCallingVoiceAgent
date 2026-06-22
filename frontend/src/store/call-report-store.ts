import { create } from "zustand";

import { fetchCallReports } from "@/lib/api";
import type { CallReport } from "@/lib/types";

const initialReports: CallReport[] = [
  {
    id: "seed-call-1",
    companyId: "bridgeon-skillversity",
    fromNumber: "+91 98470 00001",
    toNumber: "+91 80000 00001",
    startedAt: "2026-06-14T11:02:00.000Z",
    endedAt: "2026-06-14T11:05:30.000Z",
    durationSeconds: 210,
    turns: [],
    recordingUrl: "",
    summary:
      "Caller asked about the MERN Stack course duration and fees.\nAgent explained the 16-week curriculum and placement-focused capstone.\nCaller asked to be added to the next batch.",
    sentiment: "positive",
    outcome: "interested",
    sheetSyncStatus: "synced",
    createdAt: "2026-06-14T11:05:31.000Z",
    rewardScore: 0.78,
    rewardBreakdown: { outcomeReward: 0.7, microRewards: 0.16, efficiencyPenalty: 0, total: 0.78, turnRewards: [] },
    mdpStates: [
      { turnIndex: 0, phase: "opening", customerSentiment: "neutral", objectionsRaised: 0, durationSeconds: 0 },
      { turnIndex: 1, phase: "discovery", customerSentiment: "positive", objectionsRaised: 0, durationSeconds: 0 },
      { turnIndex: 2, phase: "pitch", customerSentiment: "positive", objectionsRaised: 0, durationSeconds: 0 },
      { turnIndex: 3, phase: "closing", customerSentiment: "positive", objectionsRaised: 0, durationSeconds: 0 },
    ],
    engagementScores: [
      { turnIndex: 1, score: 0.7, triggeredAdaptation: false },
      { turnIndex: 3, score: 0.85, triggeredAdaptation: false },
    ],
  },
  {
    id: "seed-call-2",
    companyId: "bridgeon-skillversity",
    fromNumber: "+91 98470 00002",
    toNumber: "+91 80000 00001",
    startedAt: "2026-06-14T14:18:00.000Z",
    endedAt: "2026-06-14T14:20:45.000Z",
    durationSeconds: 165,
    turns: [],
    recordingUrl: "",
    summary:
      "Caller expressed interest in the Data Science course.\nCaller was busy and requested a callback the next day.\nAgent confirmed a follow-up call would be scheduled.",
    sentiment: "neutral",
    outcome: "callback",
    sheetSyncStatus: "skipped",
    createdAt: "2026-06-14T14:20:46.000Z",
    rewardScore: 0.22,
    rewardBreakdown: { outcomeReward: 0.2, microRewards: 0.08, efficiencyPenalty: 0, total: 0.22, turnRewards: [] },
    mdpStates: [
      { turnIndex: 0, phase: "opening", customerSentiment: "neutral", objectionsRaised: 0, durationSeconds: 0 },
      { turnIndex: 1, phase: "objections", customerSentiment: "neutral", objectionsRaised: 1, durationSeconds: 0 },
      { turnIndex: 2, phase: "closing", customerSentiment: "neutral", objectionsRaised: 1, durationSeconds: 0 },
    ],
    engagementScores: [
      { turnIndex: 1, score: 0.45, triggeredAdaptation: false },
    ],
  },
  {
    id: "seed-call-3",
    companyId: "bridgeon-skillversity",
    fromNumber: "+91 98470 00003",
    toNumber: "+91 80000 00001",
    startedAt: "2026-06-14T16:40:00.000Z",
    endedAt: "2026-06-14T16:44:12.000Z",
    durationSeconds: 252,
    turns: [],
    recordingUrl: "",
    summary:
      "Caller paid for the UI/UX course but did not receive login details.\nCaller was frustrated and asked to speak with a manager.\nAgent escalated the call to a human team member.",
    sentiment: "negative",
    outcome: "escalated",
    sheetSyncStatus: "failed",
    createdAt: "2026-06-14T16:44:13.000Z",
    rewardScore: -0.08,
    rewardBreakdown: { outcomeReward: -0.1, microRewards: 0.02, efficiencyPenalty: 0, total: -0.08, turnRewards: [] },
    mdpStates: [
      { turnIndex: 0, phase: "opening", customerSentiment: "neutral", objectionsRaised: 0, durationSeconds: 0 },
      { turnIndex: 1, phase: "objections", customerSentiment: "negative", objectionsRaised: 1, durationSeconds: 0 },
      { turnIndex: 2, phase: "closing", customerSentiment: "negative", objectionsRaised: 1, durationSeconds: 0 },
    ],
    engagementScores: [
      { turnIndex: 1, score: 0.2, triggeredAdaptation: true },
    ],
  },
];

interface CallReportState {
  reports: CallReport[];
  isLoading: boolean;
  error: string | null;
  loadCallReports: () => Promise<void>;
}

export const useCallReportStore = create<CallReportState>((set) => ({
  reports: initialReports,
  isLoading: false,
  error: null,

  loadCallReports: async () => {
    set({ isLoading: true, error: null });
    try {
      const reports = await fetchCallReports();
      set({ reports, isLoading: false });
    } catch {
      set({
        isLoading: false,
        error: "Could not reach the backend. Showing local data only.",
      });
    }
  },
}));
