"use client";

import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchABTests,
  fetchGuardrailEvents,
  fetchPerformanceMatrix,
  fetchPolicyVersions,
  fetchRLSettings,
  simulateABCall,
  updateRLSettings,
} from "@/lib/api";
import type { ABTest, GuardrailEvent, PerformanceMatrixRow, PolicyVersion, RLSettings } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "settings" | "matrix" | "policies" | "ab-tests" | "guardrails";

const OPENING_LABELS: Record<string, string> = {
  warm_question: "Warm Question",
  direct_hook: "Direct Hook",
  problem_first: "Problem First",
  local_connect: "Local Connect",
};

const PITCH_LABELS: Record<string, string> = {
  placement: "Placement Focus",
  curriculum: "Curriculum",
  speed_roi: "Speed / ROI",
};

const CTA_LABELS: Record<string, string> = {
  book_counseling: "Book Counseling",
  branch_visit: "Branch Visit",
  whatsapp_followup: "WhatsApp Follow-up",
};

function conversionRate(conversions: number, calls: number): string {
  if (!calls) return "—";
  return `${((conversions / calls) * 100).toFixed(0)}%`;
}

export default function RlEnginePage() {
  const [activeTab, setActiveTab] = useState<Tab>("settings");

  // Settings (Phase 24)
  const [settings, setSettings] = useState<RLSettings | null>(null);
  const [epsilonDraft, setEpsilonDraft] = useState(0.3);
  const [saving, setSaving] = useState(false);

  // Performance Matrix (Phase 25)
  const [matrix, setMatrix] = useState<PerformanceMatrixRow[]>([]);
  const [matrixLoading, setMatrixLoading] = useState(false);

  // Policy Versions (Phase 28)
  const [policies, setPolicies] = useState<PolicyVersion[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);

  // A/B Tests (Phase 28)
  const [abTests, setAbTests] = useState<ABTest[]>([]);
  const [abLoading, setAbLoading] = useState(false);
  const [simulating, setSimulating] = useState<string | null>(null);

  // Guardrail Events (Phase 27)
  const [guardrailEvents, setGuardrailEvents] = useState<GuardrailEvent[]>([]);
  const [guardrailLoading, setGuardrailLoading] = useState(false);

  // Load settings on mount
  useEffect(() => {
    fetchRLSettings().then((s) => {
      setSettings(s);
      setEpsilonDraft(s.epsilon);
    }).catch(() => null);
  }, []);

  useEffect(() => {
    if (activeTab === "matrix" && matrix.length === 0) {
      setMatrixLoading(true);
      fetchPerformanceMatrix().then(setMatrix).catch(() => null).finally(() => setMatrixLoading(false));
    }
    if (activeTab === "policies" && policies.length === 0) {
      setPoliciesLoading(true);
      fetchPolicyVersions().then(setPolicies).catch(() => null).finally(() => setPoliciesLoading(false));
    }
    if (activeTab === "ab-tests" && abTests.length === 0) {
      setAbLoading(true);
      fetchABTests().then(setAbTests).catch(() => null).finally(() => setAbLoading(false));
    }
    if (activeTab === "guardrails" && guardrailEvents.length === 0) {
      setGuardrailLoading(true);
      fetchGuardrailEvents().then(setGuardrailEvents).catch(() => null).finally(() => setGuardrailLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function saveEpsilon() {
    setSaving(true);
    try {
      const updated = await updateRLSettings({ epsilon: epsilonDraft });
      setSettings(updated);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  async function toggleSetting(key: "enableEngagementAdaptation" | "enableGuardrails") {
    if (!settings) return;
    const updated = await updateRLSettings({ [key]: !settings[key] }).catch(() => null);
    if (updated) setSettings(updated);
  }

  async function handleSimulate(testId: string) {
    setSimulating(testId);
    try {
      const updated = await simulateABCall(testId);
      setAbTests((prev) => prev.map((t) => (t.id === testId ? updated : t)));
    } catch {
      // silent
    } finally {
      setSimulating(null);
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "settings", label: "Settings" },
    { id: "matrix", label: "Performance Matrix" },
    { id: "policies", label: "Policy Versions" },
    { id: "ab-tests", label: "A/B Tests" },
    { id: "guardrails", label: "Guardrail Events" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="RL Engine"
        description="Policy performance, exploration rate, contextual bandit segments, and A/B policy testing."
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

      {/* Settings (Phase 24) */}
      {activeTab === "settings" && settings && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Epsilon slider */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Exploration Rate (ε)</CardTitle>
              <CardDescription>
                Fraction of calls that use a random action instead of the learned best action.
                ε = 0.0 = pure exploit, ε = 1.0 = pure explore.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Exploit (0.0)</span>
                  <span className="font-semibold">{epsilonDraft.toFixed(2)}</span>
                  <span>Explore (1.0)</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={epsilonDraft}
                  onChange={(e) => setEpsilonDraft(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Current live ε: <strong>{settings.epsilon.toFixed(4)}</strong></p>
                <p>Min ε: {settings.epsilonMin} · Decay: {settings.epsilonDecay} per call</p>
              </div>
              <Button size="sm" onClick={saveEpsilon} disabled={saving}>
                {saving ? "Saving…" : "Update ε"}
              </Button>
            </CardContent>
          </Card>

          {/* Feature toggles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feature Toggles</CardTitle>
              <CardDescription>Enable or disable real-time adaptation and safety guardrails.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: "enableEngagementAdaptation" as const, label: "Real-Time Engagement Adaptation", description: "Shorten responses or pivot when engagement drops below 40%." },
                { key: "enableGuardrails" as const, label: "Guardrail Classifier", description: "Block exaggerated claims and honor human-transfer requests." },
              ].map(({ key, label, description }) => (
                <div key={key} className="flex items-start justify-between gap-3 rounded-md border p-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={settings[key] ? "default" : "outline"}
                    onClick={() => toggleSetting(key)}
                  >
                    {settings[key] ? "On" : "Off"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Action Space */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Action Space</CardTitle>
              <CardDescription>Available conversational strategy variants for the ε-greedy selector.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Opening Strategies</p>
                {settings.openingStrategies.map((s) => (
                  <div key={s} className="rounded border px-2 py-1.5 text-sm">{OPENING_LABELS[s] ?? s}</div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pitch Angles</p>
                {settings.pitchAngles.map((s) => (
                  <div key={s} className="rounded border px-2 py-1.5 text-sm">{PITCH_LABELS[s] ?? s}</div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">CTA Variants</p>
                {settings.ctaVariants.map((s) => (
                  <div key={s} className="rounded border px-2 py-1.5 text-sm">{CTA_LABELS[s] ?? s}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Matrix (Phase 25) */}
      {activeTab === "matrix" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Best action per context segment learned from historical call outcomes.
          </p>
          {matrixLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {["Context", "Language", "Time of Day", "Lead Source", "Best Opening", "Best Pitch", "Best CTA", "Samples", "Win Rate"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {matrix.map((row) => (
                    <tr key={row.contextKey} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{row.contextKey}</td>
                      <td className="px-3 py-2 capitalize">{row.language}</td>
                      <td className="px-3 py-2 capitalize">{row.timeOfDay}</td>
                      <td className="px-3 py-2 capitalize">{row.leadSource}</td>
                      <td className="px-3 py-2">{OPENING_LABELS[row.bestOpening] ?? row.bestOpening}</td>
                      <td className="px-3 py-2">{PITCH_LABELS[row.bestPitch] ?? row.bestPitch}</td>
                      <td className="px-3 py-2">{CTA_LABELS[row.bestCta] ?? row.bestCta}</td>
                      <td className="px-3 py-2 text-center">{row.sampleCount}</td>
                      <td className="px-3 py-2">
                        <Badge variant={row.winRate >= 0.6 ? "success" : "warning"}>
                          {(row.winRate * 100).toFixed(0)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Policy Versions (Phase 28) */}
      {activeTab === "policies" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Named policy snapshots that can be compared in A/B tests.
          </p>
          {policiesLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {policies.map((p) => (
                <Card key={p.id}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      {p.isBaseline && <Badge variant="secondary">Baseline</Badge>}
                    </div>
                    {p.description && <CardDescription>{p.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground">ε</span>
                    <span>{p.epsilon}</span>
                    <span className="text-muted-foreground">Opening</span>
                    <span>{OPENING_LABELS[p.openingStrategy] ?? p.openingStrategy}</span>
                    <span className="text-muted-foreground">Pitch</span>
                    <span>{PITCH_LABELS[p.pitchAngle] ?? p.pitchAngle}</span>
                    <span className="text-muted-foreground">CTA</span>
                    <span>{CTA_LABELS[p.ctaVariant] ?? p.ctaVariant}</span>
                    <span className="text-muted-foreground">Created</span>
                    <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* A/B Tests (Phase 28) */}
      {activeTab === "ab-tests" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Route a fraction of calls to a candidate policy and compare conversion metrics against the baseline.
          </p>
          {abLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="space-y-4">
              {abTests.map((test) => {
                const crA = test.callsA ? ((test.conversionsA / test.callsA) * 100).toFixed(0) : "0";
                const crB = test.callsB ? ((test.conversionsB / test.callsB) * 100).toFixed(0) : "0";
                const winner = test.callsA && test.callsB
                  ? test.conversionsA / test.callsA >= test.conversionsB / test.callsB ? "A" : "B"
                  : null;
                return (
                  <Card key={test.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <CardTitle className="text-base">{test.name}</CardTitle>
                          <CardDescription>Split: {(test.splitRatio * 100).toFixed(0)}% routed to Policy B</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={test.isActive ? "success" : "secondary"}>
                            {test.isActive ? "Active" : "Paused"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSimulate(test.id)}
                            disabled={simulating === test.id}
                          >
                            {simulating === test.id ? "Simulating…" : "Simulate Call"}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: "Policy A (Baseline)", calls: test.callsA, conversions: test.conversionsA, cr: crA, isWinner: winner === "A" },
                          { label: "Policy B (Candidate)", calls: test.callsB, conversions: test.conversionsB, cr: crB, isWinner: winner === "B" },
                        ].map(({ label, calls, conversions, cr, isWinner }) => (
                          <div
                            key={label}
                            className={cn(
                              "rounded-md border p-3 space-y-1 text-sm",
                              isWinner && "border-success bg-success/5",
                            )}
                          >
                            <div className="flex items-center gap-2 font-medium">
                              {label}
                              {isWinner && <Badge variant="success" className="text-xs">Leading</Badge>}
                            </div>
                            <p className="text-muted-foreground">{calls} calls · {conversions} conversions</p>
                            <p className="text-2xl font-bold">{cr}% <span className="text-sm font-normal text-muted-foreground">conv. rate</span></p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Guardrail Events (Phase 27) */}
      {activeTab === "guardrails" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Responses that were blocked and replaced by the guardrail classifier during live calls.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setGuardrailLoading(true);
                fetchGuardrailEvents().then(setGuardrailEvents).catch(() => null).finally(() => setGuardrailLoading(false));
              }}
              disabled={guardrailLoading}
            >
              {guardrailLoading ? "Loading…" : "Refresh"}
            </Button>
          </div>
          {guardrailEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No guardrail events yet. Events are recorded when the live agent produces a prohibited response during a call.
            </p>
          ) : (
            <div className="space-y-3">
              {guardrailEvents.map((event) => (
                <Card key={event.id}>
                  <CardContent className="pt-4 space-y-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="destructive">{event.blockedReason}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(event.occurredAt).toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground ml-auto">Call: {event.callSid}</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Original (blocked)</p>
                      <p className="italic text-muted-foreground">"{event.originalText}"</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Replacement</p>
                      <p className="text-success">"{event.replacementText}"</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
