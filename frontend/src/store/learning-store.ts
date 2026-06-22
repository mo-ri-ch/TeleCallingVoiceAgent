import { create } from "zustand";

import { fetchRecordings } from "@/lib/api";
import type { RecordingUpload } from "@/lib/types";

const initialRecordings: RecordingUpload[] = [
  {
    id: "seed-rec-1",
    label: "Successful MERN Stack Enrollment",
    outcome: "enrolled",
    callDirection: "outbound",
    rating: 5,
    fileName: "mern_enrollment_call.wav",
    fileSize: 96044,
    fileUrl: "http://localhost:8000/learning-uploads/seed-rec-1.wav",
    durationSeconds: 3.0,
    status: "ready",
    uploadedAt: "2026-06-10T09:00:00.000Z",
    transcript: [],
    transcriptError: "",
    toneProfile: { speakingRate: 140, pitchCategory: "warm", energyLevel: "high", pauseFrequency: "moderate", overallScore: 10 },
  },
  {
    id: "seed-rec-2",
    label: "Interested Lead – Data Science Query",
    outcome: "interested",
    callDirection: "inbound",
    rating: 4,
    fileName: "data_science_inbound.wav",
    fileSize: 80044,
    fileUrl: "http://localhost:8000/learning-uploads/seed-rec-2.wav",
    durationSeconds: 2.5,
    status: "uploaded",
    uploadedAt: "2026-06-11T14:30:00.000Z",
    transcript: [],
    transcriptError: "",
    toneProfile: null,
  },
  {
    id: "seed-rec-3",
    label: "Lost Sale – Price Objection",
    outcome: "not_interested",
    callDirection: "outbound",
    rating: 2,
    fileName: "price_objection_outbound.wav",
    fileSize: 64044,
    fileUrl: "http://localhost:8000/learning-uploads/seed-rec-3.wav",
    durationSeconds: 2.0,
    status: "uploaded",
    uploadedAt: "2026-06-12T11:15:00.000Z",
    transcript: [],
    transcriptError: "",
    toneProfile: null,
  },
];

interface LearningState {
  recordings: RecordingUpload[];
  isLoading: boolean;
  error: string | null;
  loadRecordings: () => Promise<void>;
  addRecording: (recording: RecordingUpload) => void;
  updateRecording: (recording: RecordingUpload) => void;
}

export const useLearningStore = create<LearningState>((set) => ({
  recordings: initialRecordings,
  isLoading: false,
  error: null,

  loadRecordings: async () => {
    set({ isLoading: true, error: null });
    try {
      const recordings = await fetchRecordings();
      set({ recordings, isLoading: false });
    } catch {
      set({
        isLoading: false,
        error: "Could not reach the backend. Showing local data only.",
      });
    }
  },

  addRecording: (recording) => {
    set((state) => ({ recordings: [recording, ...state.recordings] }));
  },

  updateRecording: (recording) => {
    set((state) => ({
      recordings: state.recordings.map((r) => (r.id === recording.id ? recording : r)),
    }));
  },
}));
