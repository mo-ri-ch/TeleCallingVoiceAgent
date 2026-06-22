"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Loader2, Mic, MicOff, Phone, Send, User } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { PhoneCallModal } from "@/components/playground/phone-call-modal";
import { VoiceWaveform, type VoiceState } from "@/components/playground/voice-waveform";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sendPlaygroundMessage, sendPlaygroundVoiceMessage } from "@/lib/api";
import { PcmRecorder } from "@/lib/pcm-recorder";
import { TONE_OPTIONS, type PlaygroundMessage, type PrimaryLanguage } from "@/lib/types";
import { useCompanyStore } from "@/store/company-store";

const SPEECH_LOCALES: Record<PrimaryLanguage, string> = {
  malayalam: "ml-IN",
  hindi: "hi-IN",
  english: "en-IN",
  tamil: "ta-IN",
  kannada: "kn-IN",
};

export default function PlaygroundPage() {
  const companies = useCompanyStore((state) => state.companies);
  const loadCompanies = useCompanyStore((state) => state.loadCompanies);

  const [companyId, setCompanyId] = useState("");
  const [messages, setMessages] = useState<PlaygroundMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [callOpen, setCallOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const pcmRecorderRef = useRef<PcmRecorder | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isSending]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      pcmRecorderRef.current?.stop();
      window.speechSynthesis.cancel();
      audioPlayerRef.current?.pause();
    };
  }, []);

  const effectiveCompanyId = companyId || companies[0]?.id || "";
  const company = companies.find((c) => c.id === effectiveCompanyId);
  const toneLabel =
    TONE_OPTIONS.find((option) => option.value === company?.tone)?.label ?? "";
  const speechLocale = SPEECH_LOCALES[company?.primaryLanguage ?? "english"];

  // Malayalam uses the Sarvam AI voice pipeline (Saarika STT / Bulbul TTS) for
  // accurate code-switched ("Manglish") recognition and natural local cadence,
  // instead of the browser's Web Speech API.
  const useSarvamVoice = company?.primaryLanguage === "malayalam";

  const SpeechRecognitionCtor =
    typeof window !== "undefined"
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition
      : undefined;
  const isMicSupported = useSarvamVoice
    ? typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia
    : !!SpeechRecognitionCtor;

  function handleCompanyChange(value: string) {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    pcmRecorderRef.current?.stop();
    pcmRecorderRef.current = null;
    window.speechSynthesis.cancel();
    audioPlayerRef.current?.pause();
    setVoiceState("idle");
    setCompanyId(value);
    setMessages([]);
    setError(null);
    setVoiceError(null);
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window) || !text.trim()) {
      setVoiceState("idle");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLocale;
    utterance.onend = () => setVoiceState("idle");
    utterance.onerror = () => setVoiceState("idle");
    setVoiceState("speaking");
    window.speechSynthesis.speak(utterance);
  }

  function playAudio(base64Wav: string) {
    if (!base64Wav) {
      setVoiceState("idle");
      return;
    }
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio();
    }
    const audioEl = audioPlayerRef.current;
    audioEl.onended = () => setVoiceState("idle");
    audioEl.onerror = () => setVoiceState("idle");
    audioEl.src = `data:audio/wav;base64,${base64Wav}`;
    setVoiceState("speaking");
    void audioEl.play().catch(() => setVoiceState("idle"));
  }

  async function submitMessage(text: string, options?: { voice?: boolean }) {
    const trimmed = text.trim();
    if (!trimmed || !effectiveCompanyId || isSending) return;

    const userMessage: PlaygroundMessage = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    if (options?.voice) setVoiceState("thinking");
    setIsSending(true);

    try {
      const data = await sendPlaygroundMessage(effectiveCompanyId, nextMessages);
      setMessages([...nextMessages, data.reply]);
      if (options?.voice) {
        speak(data.reply.content);
      } else {
        setVoiceState("idle");
      }
    } catch {
      setError(
        "Could not reach the AI agent. Check that the backend is running and ANTHROPIC_API_KEY is set."
      );
      setVoiceState("idle");
    } finally {
      setIsSending(false);
    }
  }

  async function submitVoiceRecording(audioBlob: Blob) {
    if (!effectiveCompanyId) return;

    setError(null);
    setVoiceError(null);
    setVoiceState("thinking");
    setIsSending(true);

    try {
      const data = await sendPlaygroundVoiceMessage(effectiveCompanyId, audioBlob, messages);
      const userMessage: PlaygroundMessage = { role: "user", content: data.transcript };
      setMessages([...messages, userMessage, data.reply]);
      playAudio(data.audioBase64);
    } catch (err) {
      setVoiceError(
        err instanceof Error
          ? err.message
          : "Could not reach the AI agent. Check that the backend is running and SARVAM_API_KEY is set."
      );
      setVoiceState("idle");
    } finally {
      setIsSending(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await submitMessage(input);
  }

  function startListening() {
    if (!SpeechRecognitionCtor || !effectiveCompanyId) return;

    window.speechSynthesis.cancel();
    setError(null);
    setVoiceError(null);
    setInput("");

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = speechLocale;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let transcript = "";
      let isFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        transcript += result[0].transcript;
        if (result.isFinal) isFinal = true;
      }
      setInput(transcript);
      if (isFinal) {
        recognition.stop();
        const finalTranscript = transcript.trim();
        if (finalTranscript) {
          void submitMessage(finalTranscript, { voice: true });
        } else {
          setVoiceState("idle");
        }
      }
    };

    recognition.onerror = (event) => {
      setVoiceError(`Microphone error: ${event.error}`);
      setVoiceState("idle");
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setVoiceState((current) => (current === "listening" ? "idle" : current));
    };

    recognitionRef.current = recognition;
    setVoiceState("listening");
    recognition.start();
  }

  async function startRecording() {
    if (!effectiveCompanyId) return;

    audioPlayerRef.current?.pause();
    setError(null);
    setVoiceError(null);

    try {
      const recorder = new PcmRecorder();
      await recorder.start();
      pcmRecorderRef.current = recorder;
      setVoiceState("listening");
    } catch {
      setVoiceError("Microphone access was denied or is unavailable.");
      setVoiceState("idle");
    }
  }

  function stopRecordingAndSubmit() {
    const recorder = pcmRecorderRef.current;
    pcmRecorderRef.current = null;
    if (!recorder) {
      setVoiceState("idle");
      return;
    }
    const audioBlob = recorder.stop();
    setVoiceState("thinking");
    void submitVoiceRecording(audioBlob);
  }

  function handleMicClick() {
    if (useSarvamVoice) {
      if (voiceState === "listening") {
        stopRecordingAndSubmit();
      } else if (voiceState === "speaking") {
        audioPlayerRef.current?.pause();
        setVoiceState("idle");
      } else if (voiceState === "idle") {
        void startRecording();
      }
      return;
    }

    if (voiceState === "listening") {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setVoiceState("idle");
    } else if (voiceState === "speaking") {
      window.speechSynthesis.cancel();
      setVoiceState("idle");
    } else if (voiceState === "idle") {
      startListening();
    }
  }

  return (
    <div className="space-y-6">
      {callOpen && company && (
        <PhoneCallModal
          companyId={effectiveCompanyId}
          agentName={company.agentName}
          companyName={company.name}
          onClose={() => setCallOpen(false)}
        />
      )}
      <PageHeader
        title="AI Agent Playground"
        description="Chat with the AI telecalling agent as a customer would, grounded in the live knowledge base."
      />

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() => setCallOpen(true)}
              disabled={!effectiveCompanyId}
              className="gap-2 rounded-full bg-green-600 hover:bg-green-700 text-white"
            >
              <Phone className="size-4" />
              Simulate Phone Call
            </Button>
            <span className="text-sm font-medium">or chat:</span>
            <Select value={effectiveCompanyId} onValueChange={handleCompanyChange}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.agentName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {company && (
              <>
                <Badge variant="secondary">{toneLabel} tone</Badge>
                <Badge variant="outline">{company.pagesIndexed} pages indexed</Badge>
                {useSarvamVoice && (
                  <Badge variant="outline" className="border-primary/40 text-primary">
                    Malayalam voice via Sarvam AI
                  </Badge>
                )}
              </>
            )}
          </div>

          <div
            ref={scrollRef}
            className="flex h-[480px] flex-col gap-3 overflow-y-auto rounded-md border bg-muted/30 p-4"
          >
            {messages.length === 0 && (
              <p className="m-auto text-sm text-muted-foreground">
                {company
                  ? `Say hello to ${company.agentName} from ${company.name}…`
                  : "Select a company to start chatting."}
              </p>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 ${
                  message.role === "user" ? "flex-row-reverse self-end" : "self-start"
                }`}
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  {message.role === "user" ? (
                    <User className="size-4" />
                  ) : (
                    <Bot className="size-4" />
                  )}
                </div>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border bg-card text-card-foreground"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex items-start gap-2 self-start">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Bot className="size-4" />
                </div>
                <div className="flex items-center gap-1 rounded-2xl border bg-card px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  {company?.agentName ?? "Agent"} is typing…
                </div>
              </div>
            )}
          </div>

          {voiceState !== "idle" && (
            <div className="flex justify-center">
              <VoiceWaveform state={voiceState} />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          {voiceError && <p className="text-sm text-destructive">{voiceError}</p>}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                voiceState === "listening"
                  ? useSarvamVoice
                    ? "Recording… click the mic to stop and send"
                    : "Listening…"
                  : company
                    ? `Message ${company.agentName}…`
                    : "Select a company first"
              }
              disabled={!effectiveCompanyId || isSending || voiceState === "listening"}
            />
            <Button
              type="button"
              variant={voiceState === "listening" ? "destructive" : "outline"}
              size="icon"
              onClick={handleMicClick}
              disabled={!effectiveCompanyId || !isMicSupported || isSending}
              title={
                !isMicSupported
                  ? "Voice input is not supported in this browser"
                  : voiceState === "listening"
                    ? useSarvamVoice
                      ? "Stop recording and send"
                      : "Stop listening"
                    : voiceState === "speaking"
                      ? "Stop speaking"
                      : "Speak to the agent"
              }
            >
              {voiceState === "listening" ? <MicOff /> : <Mic />}
            </Button>
            <Button
              type="submit"
              disabled={!input.trim() || !effectiveCompanyId || isSending || voiceState === "listening"}
            >
              {isSending ? <Loader2 className="animate-spin" /> : <Send />}
              Send
            </Button>
          </form>

          {!isMicSupported && (
            <p className="text-xs text-muted-foreground">
              {useSarvamVoice
                ? "Microphone access isn't available here. Voice requires HTTPS or localhost and microphone permission."
                : "Voice input isn't supported in this browser. Try Chrome or Edge on desktop to use the microphone."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
