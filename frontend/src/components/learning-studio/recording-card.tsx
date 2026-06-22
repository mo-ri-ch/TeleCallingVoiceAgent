"use client";

import { useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, Mic, PhoneIncoming, PhoneOutgoing, Star, Timer } from "lucide-react";

import { Badge, type badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { triggerTranscription } from "@/lib/api";
import type { CallDirection, RecordingOutcome, RecordingStatus, RecordingUpload, TranscriptSpeaker } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export const OUTCOME_LABEL: Record<RecordingOutcome, string> = {
  enrolled: "Enrolled",
  interested: "Interested",
  not_interested: "Not Interested",
};

export const OUTCOME_VARIANT: Record<RecordingOutcome, BadgeVariant> = {
  enrolled: "success",
  interested: "warning",
  not_interested: "destructive",
};

export const STATUS_LABEL: Record<RecordingStatus, string> = {
  uploaded: "Uploaded",
  processing: "Processing…",
  ready: "Ready",
  failed: "Failed",
};

export const STATUS_VARIANT: Record<RecordingStatus, BadgeVariant> = {
  uploaded: "outline",
  processing: "warning",
  ready: "success",
  failed: "destructive",
};

const SPEAKER_LABEL: Record<TranscriptSpeaker, string> = {
  AGENT: "Agent",
  CUSTOMER: "Customer",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "";
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

interface RecordingCardProps {
  recording: RecordingUpload;
  onUpdated?: (updated: RecordingUpload) => void;
}

export function RecordingCard({ recording, onUpdated }: RecordingCardProps) {
  const duration = formatDuration(recording.durationSeconds);
  const DirectionIcon = recording.callDirection === "inbound" ? PhoneIncoming : PhoneOutgoing;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showTone, setShowTone] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  async function handleTranscribe() {
    setTranscribing(true);
    try {
      const updated = await triggerTranscription(recording.id);
      onUpdated?.(updated);
    } catch {
      // silent — status will reflect failure
    } finally {
      setTranscribing(false);
    }
  }

  function seekTo(startTime: number) {
    if (audioRef.current) {
      audioRef.current.currentTime = startTime;
      audioRef.current.play().catch(() => null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <CardTitle className="truncate text-base">{recording.label}</CardTitle>
            <CardDescription className="flex items-center gap-1.5">
              <DirectionIcon className="size-3.5 shrink-0" />
              {recording.callDirection === "inbound" ? "Inbound" : "Outbound"} &middot;{" "}
              {recording.fileName}
            </CardDescription>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            <Badge variant={OUTCOME_VARIANT[recording.outcome]}>
              {OUTCOME_LABEL[recording.outcome]}
            </Badge>
            <Badge variant={STATUS_VARIANT[recording.status]}>
              {STATUS_LABEL[recording.status]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={cn(
                  "size-4",
                  s <= recording.rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "fill-transparent text-muted-foreground",
                )}
              />
            ))}
            <span className="ml-0.5">{recording.rating}/5</span>
          </div>
          {duration && (
            <span className="flex items-center gap-1.5">
              <Timer className="size-4 shrink-0" />
              {duration}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4 shrink-0" />
            {new Date(recording.uploadedAt).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })}
          </span>
          <span>{formatBytes(recording.fileSize)}</span>
        </div>

        {/* Audio player */}
        {recording.fileUrl ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio ref={audioRef} controls className="w-full" src={recording.fileUrl} />
        ) : (
          <p className="text-sm text-muted-foreground">Recording file unavailable.</p>
        )}

        {/* Tone Profile (Phase 18) */}
        {recording.toneProfile && (
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowTone((p) => !p)}
            >
              {showTone ? <ChevronUp /> : <ChevronDown />}
              {showTone ? "Hide Tone Profile" : "Tone Profile"}
            </Button>
            {showTone && (
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Speaking Rate</span>
                <span className="font-medium">{recording.toneProfile.speakingRate} wpm</span>
                <span className="text-muted-foreground">Pitch</span>
                <span className="font-medium capitalize">{recording.toneProfile.pitchCategory}</span>
                <span className="text-muted-foreground">Energy</span>
                <span className="font-medium capitalize">{recording.toneProfile.energyLevel}</span>
                <span className="text-muted-foreground">Pauses</span>
                <span className="font-medium capitalize">{recording.toneProfile.pauseFrequency}</span>
                <span className="text-muted-foreground">Overall Score</span>
                <span className="font-medium">{recording.toneProfile.overallScore} / 10</span>
              </div>
            )}
          </div>
        )}

        {/* Transcript (Phase 17) */}
        {recording.status === "ready" && recording.transcript.length === 0 && !transcribing && (
          <Button type="button" variant="outline" size="sm" onClick={handleTranscribe}>
            <Mic className="size-3.5" />
            Transcribe Recording
          </Button>
        )}
        {transcribing && (
          <p className="text-sm text-muted-foreground">Transcribing… this may take a moment.</p>
        )}
        {recording.transcriptError && (
          <p className="text-sm text-destructive">Transcription failed: {recording.transcriptError}</p>
        )}
        {recording.transcript.length > 0 && (
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowTranscript((p) => !p)}
            >
              {showTranscript ? <ChevronUp /> : <ChevronDown />}
              {showTranscript ? "Hide Transcript" : `Transcript (${recording.transcript.length} segments)`}
            </Button>
            {showTranscript && (
              <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto rounded-md border bg-muted/30 p-2 text-sm">
                {recording.transcript.map((seg, idx) => (
                  <li
                    key={idx}
                    className={cn(
                      "flex cursor-pointer gap-2 rounded px-2 py-1 transition-colors hover:bg-muted",
                      seg.speaker === "AGENT" ? "flex-row" : "flex-row-reverse",
                    )}
                    onClick={() => seekTo(seg.startTime)}
                    title={`Click to play from ${formatTime(seg.startTime)}`}
                  >
                    <span
                      className={cn(
                        "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold",
                        seg.speaker === "AGENT"
                          ? "bg-primary/10 text-primary"
                          : "bg-success/10 text-success",
                      )}
                    >
                      {SPEAKER_LABEL[seg.speaker]}
                    </span>
                    <span className="flex-1 text-muted-foreground">{seg.text}</span>
                    <span className="shrink-0 text-xs text-muted-foreground/60">
                      {formatTime(seg.startTime)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
