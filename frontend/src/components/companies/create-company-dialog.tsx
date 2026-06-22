"use client";

import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LANGUAGE_OPTIONS,
  TONE_OPTIONS,
  type PrimaryLanguage,
  type ToneOfVoice,
} from "@/lib/types";
import { useCompanyStore } from "@/store/company-store";

interface FormState {
  name: string;
  websiteUrl: string;
  agentName: string;
  tone: ToneOfVoice;
  primaryLanguage: PrimaryLanguage;
  escalationNumbers: string[];
}

const EMPTY_FORM: FormState = {
  name: "",
  websiteUrl: "",
  agentName: "",
  tone: "friendly",
  primaryLanguage: "malayalam",
  escalationNumbers: [""],
};

export function CreateCompanyDialog() {
  const addCompany = useCompanyStore((state) => state.addCompany);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setForm(EMPTY_FORM);
      setError(null);
      setIsSubmitting(false);
    }
  }

  function updateEscalationNumber(index: number, value: string) {
    setForm((prev) => ({
      ...prev,
      escalationNumbers: prev.escalationNumbers.map((number, i) =>
        i === index ? value : number
      ),
    }));
  }

  function addEscalationNumber() {
    setForm((prev) => ({
      ...prev,
      escalationNumbers: [...prev.escalationNumbers, ""],
    }));
  }

  function removeEscalationNumber(index: number) {
    setForm((prev) => ({
      ...prev,
      escalationNumbers: prev.escalationNumbers.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim() || !form.websiteUrl.trim() || !form.agentName.trim()) {
      setError("Company name, website URL, and agent name are required.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await addCompany({
        name: form.name.trim(),
        websiteUrl: form.websiteUrl.trim(),
        agentName: form.agentName.trim(),
        tone: form.tone,
        primaryLanguage: form.primaryLanguage,
        escalationNumbers: form.escalationNumbers.map((number) => number.trim()),
      });
      handleOpenChange(false);
    } catch {
      setError("Could not save the company. Check that the backend is running.");
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New Company
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Company Profile</DialogTitle>
            <DialogDescription>
              Set up a new white-label voice agent. The website will be crawled to
              build its knowledge base in a later phase.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                placeholder="e.g., Bridgeon Skillversity"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="company-website">Website URL</Label>
              <Input
                id="company-website"
                type="url"
                placeholder="https://example.com"
                value={form.websiteUrl}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, websiteUrl: event.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="agent-name">Agent Name</Label>
                <Input
                  id="agent-name"
                  placeholder="e.g., Priya"
                  value={form.agentName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, agentName: event.target.value }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tone-of-voice">Tone of Voice</Label>
                <Select
                  value={form.tone}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, tone: value as ToneOfVoice }))
                  }
                >
                  <SelectTrigger id="tone-of-voice" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="primary-language">Primary Language</Label>
              <Select
                value={form.primaryLanguage}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    primaryLanguage: value as PrimaryLanguage,
                  }))
                }
              >
                <SelectTrigger id="primary-language" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Escalation Phone Numbers</Label>
              <div className="space-y-2">
                {form.escalationNumbers.map((number, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="+91 98765 43210"
                      value={number}
                      onChange={(event) =>
                        updateEscalationNumber(index, event.target.value)
                      }
                    />
                    {form.escalationNumbers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEscalationNumber(index)}
                        aria-label="Remove escalation number"
                      >
                        <X />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEscalationNumber}
                className="w-fit"
              >
                <Plus />
                Add another number
              </Button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Company"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
