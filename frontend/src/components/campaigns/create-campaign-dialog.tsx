"use client";

import { useState, type FormEvent } from "react";
import { Plus, Upload } from "lucide-react";

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
import { useCampaignStore } from "@/store/campaign-store";
import { useCompanyStore } from "@/store/company-store";

interface FormState {
  name: string;
  companyId: string;
  callingWindowStart: string;
  callingWindowEnd: string;
  timeZone: string;
  maxRetries: string;
  retryIntervalMinutes: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  companyId: "",
  callingWindowStart: "10:00",
  callingWindowEnd: "18:00",
  timeZone: "Asia/Kolkata",
  maxRetries: "3",
  retryIntervalMinutes: "15",
};

export function CreateCampaignDialog() {
  const addCampaign = useCampaignStore((state) => state.addCampaign);
  const companies = useCompanyStore((state) => state.companies);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setForm(EMPTY_FORM);
      setFile(null);
      setError(null);
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim() || !form.companyId) {
      setError("Campaign name and target company are required.");
      return;
    }
    if (!file) {
      setError("Upload a CSV file with your lead list.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await addCampaign({
        name: form.name.trim(),
        companyId: form.companyId,
        callingWindowStart: form.callingWindowStart,
        callingWindowEnd: form.callingWindowEnd,
        timeZone: form.timeZone.trim() || "Asia/Kolkata",
        maxRetries: Number(form.maxRetries) || 3,
        retryIntervalMinutes: Number(form.retryIntervalMinutes) || 15,
        leadsCsv: file,
      });
      handleOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save the campaign. Check that the backend is running."
      );
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Outbound Campaign</DialogTitle>
            <DialogDescription>
              Upload a lead list and configure calling hours. Each lead
              starts as &ldquo;Pending&rdquo; until the dialer reaches out.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                placeholder="e.g., MERN Stack Cohort - June Outreach"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="campaign-company">Target Company Profile</Label>
              <Select
                value={form.companyId}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, companyId: value }))
                }
              >
                <SelectTrigger id="campaign-company" className="w-full">
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="campaign-csv">Lead List (CSV)</Label>
              <Input
                id="campaign-csv"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                Columns: Name, Phone Number, Language Preference, Interest Tag.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="window-start">Calling Window Start</Label>
                <Input
                  id="window-start"
                  type="time"
                  value={form.callingWindowStart}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      callingWindowStart: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="window-end">Calling Window End</Label>
                <Input
                  id="window-end"
                  type="time"
                  value={form.callingWindowEnd}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      callingWindowEnd: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="campaign-timezone">Time Zone</Label>
              <Input
                id="campaign-timezone"
                placeholder="Asia/Kolkata"
                value={form.timeZone}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, timeZone: event.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="campaign-max-retries">Max Retries</Label>
                <Input
                  id="campaign-max-retries"
                  type="number"
                  min={0}
                  value={form.maxRetries}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      maxRetries: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="campaign-retry-interval">
                  Retry Interval (minutes)
                </Label>
                <Input
                  id="campaign-retry-interval"
                  type="number"
                  min={1}
                  value={form.retryIntervalMinutes}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      retryIntervalMinutes: event.target.value,
                    }))
                  }
                />
              </div>
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
              {isSubmitting ? "Saving…" : <><Upload /> Save Campaign</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
