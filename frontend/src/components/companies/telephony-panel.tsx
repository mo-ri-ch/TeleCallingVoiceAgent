"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, Copy, Phone, PhoneCall, Loader2 } from "lucide-react";

import { Badge, type badgeVariants } from "@/components/ui/badge";
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
  fetchTelephonyCalls,
  fetchTelephonyConfig,
  updateTelephonyConfig,
} from "@/lib/api";
import type {
  AgentState,
  CallState,
  CallStatus,
  TelephonyCallSession,
  TelephonyConfig,
} from "@/lib/types";
import type { VariantProps } from "class-variance-authority";

const AGENT_STATE_LABEL: Record<AgentState, string> = {
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
};

const AGENT_STATE_VARIANT: Record<
  AgentState,
  NonNullable<VariantProps<typeof badgeVariants>["variant"]>
> = {
  listening: "outline",
  thinking: "warning",
  speaking: "success",
};

const CALL_STATUS_LABEL: Record<CallStatus, string> = {
  in_progress: "Live",
  completed: "Ended",
};

const CALL_STATUS_VARIANT: Record<
  CallStatus,
  NonNullable<VariantProps<typeof badgeVariants>["variant"]>
> = {
  in_progress: "success",
  completed: "outline",
};

const CALL_STATE_LABEL: Record<CallState, string> = {
  greeting: "Greeting",
  interacting: "In conversation",
  holding: "On hold",
  escalating: "Connecting to human",
  bridging: "Bridging to human",
  ended: "Call ended",
};

const CALL_STATE_VARIANT: Record<
  CallState,
  NonNullable<VariantProps<typeof badgeVariants>["variant"]>
> = {
  greeting: "outline",
  interacting: "outline",
  holding: "warning",
  escalating: "warning",
  bridging: "success",
  ended: "outline",
};

export function TelephonyPanel({
  companyId,
  agentName,
}: {
  companyId: string;
  agentName: string;
}) {
  const [config, setConfig] = useState<TelephonyConfig | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [calls, setCalls] = useState<TelephonyCallSession[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetchTelephonyConfig(companyId)
      .then((data) => {
        if (cancelled) return;
        setConfig(data);
        setPhoneNumber(data.inboundPhoneNumber);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await fetchTelephonyCalls(companyId);
        if (!cancelled) setCalls(data);
      } catch {
        // Ignore transient polling errors; retry on the next tick.
      }
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [companyId]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const data = await updateTelephonyConfig(companyId, phoneNumber.trim());
      setConfig(data);
      setPhoneNumber(data.inboundPhoneNumber);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCopy() {
    if (!config) return;
    await navigator.clipboard.writeText(config.voiceWebhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const isLocalWebhook = config?.voiceWebhookUrl.includes("localhost");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inbound Telephony (Twilio)</CardTitle>
        <CardDescription>
          Connect a real phone number so callers can talk to {agentName} over
          the phone network via Twilio Media Streams.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>
            Expose this backend publicly, e.g. <code>ngrok http 8000</code>,
            and set <code>PUBLIC_BASE_URL</code> in <code>backend/.env</code>
            to the resulting HTTPS URL.
          </li>
          <li>
            In the Twilio Console, open your phone number&apos;s
            &ldquo;Voice Configuration&rdquo; and set &ldquo;A call
            comes in&rdquo; to the Voice Webhook URL below (HTTP POST).
          </li>
          <li>
            Enter that Twilio number in E.164 format (e.g.{" "}
            <code>+14155551234</code>) below and click Save.
          </li>
          <li>
            Dial the number from any phone, say &ldquo;hello&rdquo;, and{" "}
            {agentName} will pick up and respond.
          </li>
          <li>
            Mid-conversation, say &ldquo;I want to talk to a manager&rdquo; --
            {agentName} will say it&apos;s connecting you, place you on hold,
            and the call state below will shift to &ldquo;Connecting to
            human&rdquo; and then &ldquo;Bridging to human&rdquo;.
          </li>
          <li>
            To actually ring the escalation number and bridge the call, set{" "}
            <code>TWILIO_ACCOUNT_SID</code> and <code>TWILIO_AUTH_TOKEN</code>{" "}
            in <code>backend/.env</code> (and use an escalation number your
            Twilio account is allowed to call). Without these, the agent
            apologizes and keeps helping on the same call instead.
          </li>
        </ol>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Voice webhook URL
          </Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={config?.voiceWebhookUrl ?? "Loading…"}
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Copy webhook URL"
              disabled={!config}
              onClick={handleCopy}
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
          {isLocalWebhook && (
            <p className="text-xs text-muted-foreground">
              This URL points at localhost, which Twilio can&apos;t reach.
              Set <code>PUBLIC_BASE_URL</code> to your ngrok HTTPS URL and
              restart the backend.
            </p>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-2">
          <Label htmlFor={`inbound-number-${companyId}`} className="text-xs text-muted-foreground">
            Twilio phone number for this company
          </Label>
          <div className="flex gap-2">
            <Input
              id={`inbound-number-${companyId}`}
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="+14155551234"
            />
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin" /> : <Phone />}
              Save
            </Button>
          </div>
        </form>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Live &amp; recent calls
          </Label>
          {calls.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No calls yet. Dial the configured number to start a
              conversation.
            </p>
          ) : (
            <ul className="max-h-[420px] space-y-2 overflow-y-auto">
              {calls.map((call) => (
                <li key={call.id} className="rounded-md border bg-muted/30 p-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 truncate font-medium">
                      <PhoneCall className="size-3.5 shrink-0 text-primary" />
                      {call.fromNumber || "Unknown caller"}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {call.status === "in_progress" && (
                        <Badge variant={CALL_STATE_VARIANT[call.callState]}>
                          {CALL_STATE_LABEL[call.callState]}
                        </Badge>
                      )}
                      {call.status === "in_progress" &&
                        (call.callState === "greeting" ||
                          call.callState === "interacting") && (
                          <Badge variant={AGENT_STATE_VARIANT[call.agentState]}>
                            {AGENT_STATE_LABEL[call.agentState]}
                          </Badge>
                        )}
                      <Badge variant={CALL_STATUS_VARIANT[call.status]}>
                        {CALL_STATUS_LABEL[call.status]}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Started {new Date(call.startedAt).toLocaleTimeString()}
                  </p>
                  {call.turns.length > 0 && (
                    <ul className="mt-2 space-y-1 border-t pt-2">
                      {call.turns.map((turn, index) => (
                        <li key={index} className="text-xs">
                          <span className="font-medium text-foreground">
                            {turn.role === "agent" ? agentName : "Caller"}:
                          </span>{" "}
                          <span className="text-muted-foreground">{turn.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
