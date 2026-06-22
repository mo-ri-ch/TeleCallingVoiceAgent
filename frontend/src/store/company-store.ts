import { create } from "zustand";

import { createCompany, fetchCompanies, fetchCompany, triggerCrawl } from "@/lib/api";
import type { CompanyProfile, NewCompanyInput } from "@/lib/types";

export type { NewCompanyInput };

const initialCompanies: CompanyProfile[] = [
  {
    id: "bridgeon-skillversity",
    name: "Bridgeon Skillversity",
    websiteUrl: "https://bridgeon.in",
    agentName: "Priya",
    tone: "friendly",
    primaryLanguage: "malayalam",
    escalationNumbers: ["+91 98470 12345"],
    inboundPhoneNumber: "",
    crawlStatus: "not_started",
    pagesIndexed: 0,
    crawledPages: [],
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "northstar-finance-academy",
    name: "Northstar Finance Academy",
    websiteUrl: "http://localhost:8000/mock-site/index.html",
    agentName: "Arjun",
    tone: "professional",
    primaryLanguage: "english",
    escalationNumbers: ["+91 99000 11223"],
    inboundPhoneNumber: "",
    crawlStatus: "not_started",
    pagesIndexed: 0,
    crawledPages: [],
    createdAt: "2026-05-20T09:00:00.000Z",
    updatedAt: "2026-06-10T09:00:00.000Z",
  },
  {
    id: "greenfield-dental-clinic",
    name: "Greenfield Dental Clinic",
    websiteUrl: "https://greenfielddental.example.com",
    agentName: "Meera",
    tone: "formal",
    primaryLanguage: "hindi",
    escalationNumbers: ["+91 90000 33445", "+91 90000 33446"],
    inboundPhoneNumber: "",
    crawlStatus: "crawling",
    pagesIndexed: 4,
    crawledPages: [],
    createdAt: "2026-06-10T09:00:00.000Z",
    updatedAt: "2026-06-14T09:00:00.000Z",
  },
];

const ACTIVE_CRAWL_STATUSES = new Set(["queued", "crawling"]);
const POLL_INTERVAL_MS = 1500;

interface CompanyState {
  companies: CompanyProfile[];
  isLoading: boolean;
  error: string | null;
  loadCompanies: () => Promise<void>;
  addCompany: (input: NewCompanyInput) => Promise<CompanyProfile>;
  updateCompany: (company: CompanyProfile) => void;
  crawlCompany: (id: string) => Promise<void>;
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  companies: initialCompanies,
  isLoading: false,
  error: null,

  loadCompanies: async () => {
    set({ isLoading: true, error: null });
    try {
      const companies = await fetchCompanies();
      set({ companies, isLoading: false });
    } catch {
      set({
        isLoading: false,
        error: "Could not reach the backend. Showing local data only.",
      });
    }
  },

  addCompany: async (input) => {
    const company = await createCompany({
      ...input,
      escalationNumbers: input.escalationNumbers.filter((n) => n.trim() !== ""),
    });
    set((state) => ({ companies: [company, ...state.companies] }));
    return company;
  },

  updateCompany: (company) => {
    set((state) => ({
      companies: state.companies.map((c) => (c.id === company.id ? company : c)),
    }));
  },

  crawlCompany: async (id) => {
    const { updateCompany } = get();

    set((state) => ({
      companies: state.companies.map((c) =>
        c.id === id ? { ...c, crawlStatus: "queued" } : c
      ),
    }));

    try {
      updateCompany(await triggerCrawl(id));
    } catch {
      set((state) => ({
        companies: state.companies.map((c) =>
          c.id === id ? { ...c, crawlStatus: "failed" } : c
        ),
      }));
      return;
    }

    const poll = async () => {
      try {
        const company = await fetchCompany(id);
        updateCompany(company);
        if (ACTIVE_CRAWL_STATUSES.has(company.crawlStatus)) {
          setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        // Stop polling silently if the backend becomes unreachable.
      }
    };

    setTimeout(poll, POLL_INTERVAL_MS);
  },
}));
