"use client";

import { useRef, useState } from "react";
import { Upload, FileAudio, Star, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadRecording } from "@/lib/api";
import type { CallDirection, RecordingOutcome, RecordingUpload } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = [".mp3", ".wav", ".mp4"];
const MAX_BYTES = 500 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadPanelProps {
  onUploaded: (recording: RecordingUpload) => void;
}

export function UploadPanel({ onUploaded }: UploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [outcome, setOutcome] = useState<RecordingOutcome | "">("");
  const [callDirection, setCallDirection] = useState<CallDirection | "">("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function validateFile(f: File): string | null {
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED_TYPES.includes(ext)) return "File must be .mp3, .wav, or .mp4";
    if (f.size > MAX_BYTES) return "File exceeds 500 MB";
    return null;
  }

  function pickFile(f: File) {
    const err = validateFile(f);
    if (err) {
      setFileError(err);
      setFile(null);
      return;
    }
    setFileError(null);
    setFile(f);
    if (!label) setLabel(f.name.replace(/\.[^.]+$/, ""));
    setUploadState("idle");
    setUploadError(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) pickFile(f);
  }

  function clearFile() {
    setFile(null);
    setLabel("");
    setOutcome("");
    setCallDirection("");
    setRating(0);
    setUploadState("idle");
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !outcome || !callDirection || rating === 0) return;

    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("label", label.trim() || file.name.replace(/\.[^.]+$/, ""));
    formData.append("outcome", outcome);
    formData.append("call_direction", callDirection);
    formData.append("rating", String(rating));

    setUploadState("uploading");
    setUploadProgress(0);
    setUploadError(null);

    try {
      const recording = await uploadRecording(formData, setUploadProgress);
      setUploadState("done");
      onUploaded(recording);
      setTimeout(clearFile, 1800);
    } catch (err) {
      setUploadState("error");
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    }
  }

  const canSubmit =
    file !== null &&
    outcome !== "" &&
    callDirection !== "" &&
    rating > 0 &&
    uploadState !== "uploading";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload Recording</CardTitle>
        <CardDescription>
          Drag-and-drop or select a .mp3, .wav, or .mp4 file up to 500 MB.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragEnter={() => setDragOver(true)}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors select-none",
              dragOver
                ? "border-primary bg-primary/5"
                : file
                  ? "border-success bg-success/5"
                  : "border-muted-foreground/30 hover:border-muted-foreground/60",
            )}
          >
            {file ? (
              <>
                <FileAudio className="size-8 text-success" />
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                <Badge
                  variant="outline"
                  className="text-xs"
                  onClick={(e) => { e.stopPropagation(); clearFile(); }}
                >
                  <X className="size-3" /> Change file
                </Badge>
              </>
            ) : (
              <>
                <Upload className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drop an audio file here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground">.mp3 · .wav · .mp4 · up to 500 MB</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.mp4,audio/mpeg,audio/wav,audio/mp4,video/mp4"
            className="sr-only"
            onChange={handleFileInputChange}
          />
          {fileError && <p className="text-sm text-destructive">{fileError}</p>}

          {/* Metadata form — revealed once a file is selected */}
          {file && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="rec-label">Label</Label>
                <Input
                  id="rec-label"
                  placeholder="e.g., Successful MERN enrollment call"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="rec-outcome">Outcome</Label>
                  <Select
                    value={outcome}
                    onValueChange={(v) => setOutcome(v as RecordingOutcome)}
                  >
                    <SelectTrigger id="rec-outcome" className="w-full">
                      <SelectValue placeholder="Select outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enrolled">Enrolled</SelectItem>
                      <SelectItem value="interested">Interested</SelectItem>
                      <SelectItem value="not_interested">Not Interested</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="rec-direction">Call Direction</Label>
                  <Select
                    value={callDirection}
                    onValueChange={(v) => setCallDirection(v as CallDirection)}
                  >
                    <SelectTrigger id="rec-direction" className="w-full">
                      <SelectValue placeholder="Select direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inbound">Inbound</SelectItem>
                      <SelectItem value="outbound">Outbound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Call Rating</Label>
                <div
                  className="flex gap-1"
                  onMouseLeave={() => setHoverRating(null)}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onClick={() => setRating(star)}
                      aria-label={`${star} star${star === 1 ? "" : "s"}`}
                    >
                      <Star
                        className={cn(
                          "size-7 transition-colors",
                          star <= (hoverRating ?? rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "fill-transparent text-muted-foreground",
                        )}
                      />
                    </button>
                  ))}
                  {rating > 0 && (
                    <span className="ml-1 self-center text-sm text-muted-foreground">
                      {rating}/5
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {uploadState === "uploading" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Uploading…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {uploadState === "done" && (
                <p className="text-sm font-medium text-success">
                  Upload complete — recording added to Learning Sets.
                </p>
              )}
              {uploadState === "error" && uploadError && (
                <p className="text-sm text-destructive">{uploadError}</p>
              )}

              <Button type="submit" className="w-full" disabled={!canSubmit}>
                <Upload />
                {uploadState === "uploading" ? "Uploading…" : "Upload Recording"}
              </Button>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
