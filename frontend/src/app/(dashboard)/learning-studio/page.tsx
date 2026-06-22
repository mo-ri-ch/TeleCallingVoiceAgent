"use client";

import { useEffect, useState } from "react";

import { RecordingCard } from "@/components/learning-studio/recording-card";
import { UploadPanel } from "@/components/learning-studio/upload-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  applyPromptUpdate,
  fetchCompiledPrompt,
  fetchObjections,
  fetchPhraseMine,
  updateObjection,
} from "@/lib/api";
import type { CompiledPromptDiff, ObjectionEntry, PhraseMineReport, RecordingUpload } from "@/lib/types";
import { useLearningStore } from "@/store/learning-store";

type Tab = "recordings" | "phrase-mine" | "objections" | "review";

export default function LearningStudioPage() {
  const recordings = useLearningStore((state) => state.recordings);
  const recordingsError = useLearningStore((state) => state.error);
  const loadRecordings = useLearningStore((state) => state.loadRecordings);
  const addRecording = useLearningStore((state) => state.addRecording);
  const updateRecordingInStore = useLearningStore((state) => state.updateRecording);

  const [activeTab, setActiveTab] = useState<Tab>("recordings");

  // Phrase Mine state
  const [phrases, setPhrases] = useState<PhraseMineReport | null>(null);
  const [phrasesLoading, setPhrasesLoading] = useState(false);

  // Objection Playbook state
  const [objections, setObjections] = useState<ObjectionEntry[]>([]);
  const [objectionsLoading, setObjectionsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editResponse, setEditResponse] = useState("");

  // Review & Approve state
  const [compiledDiff, setCompiledDiff] = useState<CompiledPromptDiff | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [appliedMsg, setAppliedMsg] = useState("");

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  async function loadPhraseMine() {
    setPhrasesLoading(true);
    try {
      setPhrases(await fetchPhraseMine());
    } catch {
      // silent
    } finally {
      setPhrasesLoading(false);
    }
  }

  async function loadObjections() {
    setObjectionsLoading(true);
    try {
      setObjections(await fetchObjections());
    } catch {
      // silent
    } finally {
      setObjectionsLoading(false);
    }
  }

  async function loadCompiledDiff() {
    setDiffLoading(true);
    try {
      setCompiledDiff(await fetchCompiledPrompt());
    } catch {
      // silent
    } finally {
      setDiffLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "phrase-mine" && !phrases) loadPhraseMine();
    if (activeTab === "objections" && objections.length === 0) loadObjections();
    if (activeTab === "review") loadCompiledDiff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function saveEdit(id: string) {
    try {
      const updated = await updateObjection(id, editResponse);
      setObjections((prev) => prev.map((o) => (o.id === id ? updated : o)));
    } catch {
      // silent
    }
    setEditingId(null);
  }

  async function handleApplyUpdate() {
    if (!compiledDiff) return;
    setApplyLoading(true);
    try {
      await applyPromptUpdate(compiledDiff.diff);
      setAppliedMsg("Update applied! The live agent will use these learnings on the next call.");
      setCompiledDiff({ ...compiledDiff, isApplied: true });
    } catch {
      setAppliedMsg("Failed to apply update. Please try again.");
    } finally {
      setApplyLoading(false);
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "recordings", label: "Recordings" },
    { id: "phrase-mine", label: "Phrase Mine" },
    { id: "objections", label: "Objection Playbook" },
    { id: "review", label: "Review & Approve" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning Studio"
        description="Upload human-to-human call recordings to teach the agent tone, phrasing, and objection-handling patterns."
      />

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Recordings tab */}
      {activeTab === "recordings" && (
        <div className="space-y-6">
          <UploadPanel onUploaded={addRecording} />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Learning Sets</h2>
            <p className="text-sm text-muted-foreground">
              {recordings.length} recording{recordings.length !== 1 ? "s" : ""} in your training database.
            </p>
          </div>
          {recordingsError && (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {recordingsError}
            </p>
          )}
          {recordings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recordings yet. Upload a call above to get started.</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {recordings.map((recording) => (
                <RecordingCard
                  key={recording.id}
                  recording={recording}
                  onUpdated={(updated: RecordingUpload) => updateRecordingInStore(updated)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Phrase Mine tab */}
      {activeTab === "phrase-mine" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Phrases statistically correlated with successful vs failed calls.
            </p>
            <Button size="sm" variant="outline" onClick={loadPhraseMine} disabled={phrasesLoading}>
              {phrasesLoading ? "Loading…" : "Refresh"}
            </Button>
          </div>
          {phrases && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-success">Power Phrases</CardTitle>
                  <CardDescription>Common in enrolled / successful calls. Use these.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {phrases.powerPhrases.map((phrase, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Badge variant="success" className="shrink-0">✓</Badge>
                        <span className="italic">"{phrase}"</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-destructive">Drop Phrases</CardTitle>
                  <CardDescription>Common in hang-ups / not-interested outcomes. Avoid these.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {phrases.dropPhrases.map((phrase, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Badge variant="destructive" className="shrink-0">✗</Badge>
                        <span className="italic">"{phrase}"</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Objection Playbook tab */}
      {activeTab === "objections" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Auto-extracted customer objections mapped to winning agent responses.
          </p>
          {objectionsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : objections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No objections yet.</p>
          ) : (
            <div className="space-y-3">
              {objections.map((obj) => (
                <Card key={obj.id}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="capitalize">{obj.category}</Badge>
                      <span className="text-sm font-medium">"{obj.objectionText}"</span>
                      <Badge variant={obj.winPercent >= 60 ? "success" : "warning"} className="ml-auto">
                        {obj.winPercent.toFixed(0)}% win rate
                      </Badge>
                    </div>
                    {editingId === obj.id ? (
                      <div className="space-y-2">
                        <textarea
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          rows={3}
                          value={editResponse}
                          onChange={(e) => setEditResponse(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEdit(obj.id)}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-muted-foreground">{obj.bestResponse}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0"
                          onClick={() => { setEditingId(obj.id); setEditResponse(obj.bestResponse); }}
                        >
                          Edit
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review & Approve tab */}
      {activeTab === "review" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Review the compiled learning update before injecting it into the live agent.
            </p>
            <Button size="sm" variant="outline" onClick={loadCompiledDiff} disabled={diffLoading}>
              {diffLoading ? "Loading…" : "Refresh"}
            </Button>
          </div>
          {compiledDiff && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Compiled Prompt Update</CardTitle>
                <CardDescription>
                  {compiledDiff.powerPhraseCount} power phrases · {compiledDiff.dropPhraseCount} drop phrases ·{" "}
                  {compiledDiff.objectionCount} objections
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <pre className="max-h-64 overflow-y-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground whitespace-pre-wrap">
                  {compiledDiff.diff}
                </pre>
                {appliedMsg ? (
                  <p className="text-sm font-medium text-success">{appliedMsg}</p>
                ) : (
                  <Button onClick={handleApplyUpdate} disabled={applyLoading || compiledDiff.isApplied}>
                    {compiledDiff.isApplied ? "Already Applied" : applyLoading ? "Applying…" : "Approve & Apply"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
