export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

const BAR_COUNT = 5;

const STATE_LABELS: Record<Exclude<VoiceState, "idle">, string> = {
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
};

export function VoiceWaveform({ state }: { state: VoiceState }) {
  if (state === "idle") return null;

  return (
    <div className="flex items-center gap-3 rounded-full border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
      <div className="flex h-5 items-end gap-0.5" aria-hidden="true">
        {Array.from({ length: BAR_COUNT }).map((_, index) => (
          <span
            key={index}
            className={
              state === "thinking"
                ? "h-2 w-1 animate-pulse rounded-full bg-muted-foreground/50"
                : "h-5 w-1 origin-bottom animate-voice-wave rounded-full bg-primary"
            }
            style={{ animationDelay: `${index * 0.12}s` }}
          />
        ))}
      </div>
      <span className="font-medium">{STATE_LABELS[state]}</span>
    </div>
  );
}
