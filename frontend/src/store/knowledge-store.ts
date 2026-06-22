import { create } from "zustand";

import {
  createKnowledgeChunk,
  deleteKnowledgeChunk,
  fetchKnowledgeChunks,
  updateKnowledgeChunk,
} from "@/lib/api";
import type {
  KnowledgeChunk,
  KnowledgeChunkUpdateInput,
  NewKnowledgeChunkInput,
} from "@/lib/types";

interface KnowledgeState {
  chunksByCompany: Record<string, KnowledgeChunk[]>;
  loadingCompanyIds: Set<string>;
  loadChunks: (companyId: string) => Promise<void>;
  addChunk: (
    companyId: string,
    input: NewKnowledgeChunkInput
  ) => Promise<KnowledgeChunk>;
  editChunk: (
    companyId: string,
    chunkId: string,
    input: KnowledgeChunkUpdateInput
  ) => Promise<KnowledgeChunk>;
  removeChunk: (companyId: string, chunkId: string) => Promise<void>;
}

export const useKnowledgeStore = create<KnowledgeState>((set) => ({
  chunksByCompany: {},
  loadingCompanyIds: new Set(),

  loadChunks: async (companyId) => {
    set((state) => ({
      loadingCompanyIds: new Set(state.loadingCompanyIds).add(companyId),
    }));

    try {
      const chunks = await fetchKnowledgeChunks(companyId);
      set((state) => ({
        chunksByCompany: { ...state.chunksByCompany, [companyId]: chunks },
      }));
    } catch {
      set((state) => ({
        chunksByCompany: { ...state.chunksByCompany, [companyId]: [] },
      }));
    } finally {
      set((state) => {
        const loadingCompanyIds = new Set(state.loadingCompanyIds);
        loadingCompanyIds.delete(companyId);
        return { loadingCompanyIds };
      });
    }
  },

  addChunk: async (companyId, input) => {
    const chunk = await createKnowledgeChunk(companyId, input);
    set((state) => ({
      chunksByCompany: {
        ...state.chunksByCompany,
        [companyId]: [chunk, ...(state.chunksByCompany[companyId] ?? [])],
      },
    }));
    return chunk;
  },

  editChunk: async (companyId, chunkId, input) => {
    const updated = await updateKnowledgeChunk(companyId, chunkId, input);
    set((state) => ({
      chunksByCompany: {
        ...state.chunksByCompany,
        [companyId]: (state.chunksByCompany[companyId] ?? []).map((chunk) =>
          chunk.id === chunkId ? updated : chunk
        ),
      },
    }));
    return updated;
  },

  removeChunk: async (companyId, chunkId) => {
    await deleteKnowledgeChunk(companyId, chunkId);
    set((state) => ({
      chunksByCompany: {
        ...state.chunksByCompany,
        [companyId]: (state.chunksByCompany[companyId] ?? []).filter(
          (chunk) => chunk.id !== chunkId
        ),
      },
    }));
  },
}));
