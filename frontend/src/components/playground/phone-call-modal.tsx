"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PhoneCall, PhoneOff, Mic, Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendPlaygroundVoiceMessage } from "@/lib/api";
import { VadRecorder } from "@/lib/vad-recorder";
import type { PlaygroundMessage } from "@/lib/types";

type Phase = "connecting" | "greeting" | "listening" | "speech" | "processing" | "speaking" | "ended" | "error";

const PHASE_LABEL: Record<Phase, string> = {
  connecting: "Connecting…",
  greeting: "Priya is speaking…",
  listening: "Listening…",
  speech: "Heard you…",
  processing: "Thinking…",
  speaking: "Priya is speaking…",
  ended: "Call ended",
  error: "Error",
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

interface Props {
  companyId: string;
  agentName: string;
  companyName: string;
  onClose: () => void;
}

export function PhoneCallModal({ companyId, agentName, companyName, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("connecting");
  const [history, setHistory] = useState<PlaygroundMessage[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const vadRef = useRef<VadRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const historyRef = useRef<PlaygroundMessage[]>([]);

  useEffect(() => { historyRef.current = history; }, [history]);

  const stopVad = useCallback(() => {
    vadRef.current?.stop();
    vadRef.current = null;
  }, []);

  const stopAudio = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.src = "";
  }, []);

  const playAudio = useCallback((b64: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!audioRef.current) audioRef.current = new Audio();
      const el = audioRef.current;
      el.onended = () => resolve();
      el.onerror = () => resolve();
      el.src = `data:audio/wav;base64,${b64}`;
      void el.play().catch(() => resolve());
    });
  }, []);

  const startListening = useCallback(async () => {
    if (vadRef.current) return;
    try {
      const vad = new VadRecorder(
        async (blob) => {
          setPhase("processing");
          try {
            const data = await sendPlaygroundVoiceMessage(companyId, blob, historyRef.current);
            const newHistory: PlaygroundMessage[] = [
              ...historyRef.current,
              { role: "user", content: data.transcript },
              data.reply,
            ];
            setHistory(newHistory);
            setPhase("speaking");
            if (data.audioBase64) {
              await playAudio(data.audioBase64);
            }
            if (vadRef.current) {
              vadRef.current.resumeListening();
              setPhase("listening");
            }
          } catch {
            setPhase("error");
            setErrorMsg("Could not reach the AI. Check your connection.");
          }
        },
        (s) => {
          if (s === "listening") setPhase("listening");
          else if (s === "speech") setPhase("speech");
        },
      );
      vadRef.current = vad;
      await vad.start();
      setPhase("listening");
    } catch {
      setPhase("error");
      setErrorMsg("Microphone access denied. Please allow microphone and try again.");
    }
  }, [companyId, playAudio]);

  const endCall = useCallback(() => {
    stopVad();
    stopAudio();
    setPhase("ended");
    setTimeout(onClose, 1200);
  }, [stopVad, stopAudio, onClose]);

  // On mount: fetch greeting and play it, then start VAD
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const res = await fetch(`${API_BASE}/companies/${companyId}/playground/greet`);
        if (!res.ok) throw new Error("greet failed");
        const data = (await res.json()) as { text: string; audio_base64: string };

        if (cancelled) return;

        const greetMsg: PlaygroundMessage = { role: "assistant", content: data.text };
        setHistory([greetMsg]);
        setPhase("greeting");

        if (data.audio_base64) {
          await playAudio(data.audio_base64);
        }

        if (!cancelled) await startListening();
      } catch {
        if (!cancelled) {
          setPhase("error");
          setErrorMsg("Could not connect to the AI agent.");
        }
      }
    }

    void init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      stopVad();
      stopAudio();
    };
  }, [stopVad, stopAudio]);

  const phaseIcon = () => {
    if (phase === "listening") return <Mic className="size-8 animate-pulse text-green-400" />;
    if (phase === "speech") return <Mic className="size-8 text-yellow-400" />;
    if (phase === "greeting" || phase === "speaking") return <Volume2 className="size-8 animate-pulse text-blue-400" />;
    if (phase === "processing") return <Loader2 className="size-8 animate-spin text-purple-400" />;
    if (phase === "connecting") return <Loader2 className="size-8 animate-spin text-gray-400" />;
    if (phase === "ended") return <PhoneOff className="size-8 text-red-400" />;
    return <PhoneCall className="size-8 text-gray-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex w-[340px] flex-col items-center gap-6 rounded-3xl bg-gray-900 px-8 py-10 shadow-2xl">
        {/* Avatar */}
        <div className="flex size-20 items-center justify-center rounded-full bg-indigo-600 text-3xl font-bold text-white shadow-lg">
          {agentName[0]}
        </div>

        <div className="text-center">
          <p className="text-lg font-semibold text-white">{agentName}</p>
          <p className="text-sm text-gray-400">{companyName}</p>
        </div>

        {/* Status */}
        <div className="flex flex-col items-center gap-2">
          {phaseIcon()}
          <p className="text-sm text-gray-300">{PHASE_LABEL[phase]}</p>
          {phase === "error" && <p className="text-center text-xs text-red-400">{errorMsg}</p>}
        </div>

        {/* Conversation preview (last 4 lines) */}
        {history.length > 0 && (
          <div className="w-full space-y-1 rounded-xl bg-gray-800 p-3 text-xs text-gray-300 max-h-32 overflow-y-auto">
            {history.slice(-4).map((m, i) => (
              <p key={i}>
                <span className={m.role === "assistant" ? "text-indigo-400" : "text-green-400"}>
                  {m.role === "assistant" ? agentName : "You"}:
                </span>{" "}
                {m.content.slice(0, 120)}{m.content.length > 120 ? "…" : ""}
              </p>
            ))}
          </div>
        )}

        {/* End call */}
        <Button
          onClick={endCall}
          variant="destructive"
          className="rounded-full size-14 p-0"
          disabled={phase === "ended"}
        >
          <PhoneOff className="size-6" />
        </Button>
        <p className="text-xs text-gray-500">Tap to end call</p>
      </div>
    </div>
  );
}
