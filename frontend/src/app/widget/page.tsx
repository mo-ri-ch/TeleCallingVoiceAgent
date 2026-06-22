"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PhoneCall, PhoneOff, Mic, Volume2, Loader2 } from "lucide-react";
import { sendPlaygroundVoiceMessage } from "@/lib/api";
import { VadRecorder } from "@/lib/vad-recorder";
import type { PlaygroundMessage } from "@/lib/types";

type Phase = "start" | "connecting" | "greeting" | "listening" | "speech" | "processing" | "speaking" | "ended" | "error";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

const PHASE_LABEL: Record<Phase, string> = {
  start: "Tap to talk",
  connecting: "Connecting…",
  greeting: "Speaking…",
  listening: "Listening…",
  speech: "Got it…",
  processing: "Thinking…",
  speaking: "Speaking…",
  ended: "Call ended",
  error: "Error — tap to retry",
};

export default function WidgetPage() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const companyId = params.get("company") ?? "bridgeon-skillversity";

  const [phase, setPhase] = useState<Phase>("start");
  const [agentName, setAgentName] = useState("Priya");
  const [companyName, setCompanyName] = useState("Bridgeon Skillversity");
  const [history, setHistory] = useState<PlaygroundMessage[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const historyRef = useRef<PlaygroundMessage[]>([]);
  const vadRef = useRef<VadRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { historyRef.current = history; }, [history]);

  useEffect(() => {
    fetch(`${API_BASE}/companies/${companyId}`)
      .then((r) => r.json())
      .then((d: { agent_name?: string; name?: string }) => {
        if (d.agent_name) setAgentName(d.agent_name);
        if (d.name) setCompanyName(d.name);
      })
      .catch(() => {});
  }, [companyId]);

  const stopAll = useCallback(() => {
    vadRef.current?.stop();
    vadRef.current = null;
    audioRef.current?.pause();
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
            if (data.audioBase64) await playAudio(data.audioBase64);
            if (vadRef.current) { vadRef.current.resumeListening(); setPhase("listening"); }
          } catch {
            setPhase("error");
            setErrorMsg("Connection lost. Tap to retry.");
          }
        },
        (s) => {
          if (s === "listening") setPhase("listening");
          else if (s === "speech") setPhase("speech");
        },
      );
      vadRef.current = vad;
      await vad.start();
    } catch {
      setPhase("error");
      setErrorMsg("Microphone access denied.");
    }
  }, [companyId, playAudio]);

  const startCall = useCallback(async () => {
    setPhase("connecting");
    setHistory([]);
    try {
      const res = await fetch(`${API_BASE}/companies/${companyId}/playground/greet`);
      const data = (await res.json()) as { text: string; audio_base64: string };
      const greetMsg: PlaygroundMessage = { role: "assistant", content: data.text };
      setHistory([greetMsg]);
      setPhase("greeting");
      if (data.audio_base64) await playAudio(data.audio_base64);
      await startListening();
    } catch {
      setPhase("error");
      setErrorMsg("Could not connect. Check your internet.");
    }
  }, [companyId, playAudio, startListening]);

  const endCall = useCallback(() => {
    stopAll();
    setPhase("ended");
  }, [stopAll]);

  useEffect(() => () => stopAll(), [stopAll]);

  const isActive = !["start", "ended", "error"].includes(phase);

  const StatusIcon = () => {
    if (phase === "listening") return <Mic className="size-10 animate-pulse text-green-400" />;
    if (phase === "speech") return <Mic className="size-10 text-yellow-300" />;
    if (phase === "greeting" || phase === "speaking") return <Volume2 className="size-10 animate-pulse text-blue-400" />;
    if (phase === "processing" || phase === "connecting") return <Loader2 className="size-10 animate-spin text-purple-400" />;
    if (phase === "ended") return <PhoneOff className="size-10 text-red-400" />;
    return <PhoneCall className="size-10 text-white" />;
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-between p-6 text-white">
      {/* Header */}
      <div className="text-center pt-4">
        <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold">
          {agentName[0]}
        </div>
        <p className="text-lg font-semibold">{agentName}</p>
        <p className="text-sm text-gray-400">{companyName}</p>
      </div>

      {/* Status */}
      <div className="flex flex-col items-center gap-3">
        <StatusIcon />
        <p className="text-sm text-gray-300">{PHASE_LABEL[phase]}</p>
        {errorMsg && <p className="text-center text-xs text-red-400 max-w-[240px]">{errorMsg}</p>}
      </div>

      {/* Transcript */}
      {history.length > 0 && (
        <div className="w-full max-w-sm space-y-2 rounded-2xl bg-gray-800/60 p-4 text-xs max-h-48 overflow-y-auto">
          {history.slice(-6).map((m, i) => (
            <p key={i} className="leading-relaxed">
              <span className={m.role === "assistant" ? "text-indigo-400 font-medium" : "text-green-400 font-medium"}>
                {m.role === "assistant" ? agentName : "You"}:
              </span>{" "}
              {m.content}
            </p>
          ))}
        </div>
      )}

      {/* Call button */}
      <div className="flex flex-col items-center gap-3 pb-4">
        {!isActive ? (
          <button
            onClick={phase === "ended" ? endCall : startCall}
            className="flex size-16 items-center justify-center rounded-full bg-green-600 shadow-lg shadow-green-900/50 hover:bg-green-500 transition-colors"
          >
            <PhoneCall className="size-7" />
          </button>
        ) : (
          <button
            onClick={endCall}
            className="flex size-16 items-center justify-center rounded-full bg-red-600 shadow-lg shadow-red-900/50 hover:bg-red-500 transition-colors"
          >
            <PhoneOff className="size-7" />
          </button>
        )}
        <p className="text-xs text-gray-500">
          {isActive ? "Tap to end call" : phase === "ended" ? "Call ended" : "Tap to start"}
        </p>
      </div>
    </div>
  );
}
