"use client";

import { useEffect } from "react";

import { CallReportCard } from "@/components/call-logs/call-report-card";
import { PageHeader } from "@/components/layout/page-header";
import { useCallReportStore } from "@/store/call-report-store";
import { useCompanyStore } from "@/store/company-store";

export default function CallLogsPage() {
  const reports = useCallReportStore((state) => state.reports);
  const reportsError = useCallReportStore((state) => state.error);
  const loadCallReports = useCallReportStore((state) => state.loadCallReports);
  const loadCompanies = useCompanyStore((state) => state.loadCompanies);

  useEffect(() => {
    loadCallReports();
    loadCompanies();
  }, [loadCallReports, loadCompanies]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Call Logs"
        description="Inbound and outbound call history, recordings, AI summaries, and Google Sheets sync status."
      />

      {reportsError && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {reportsError}
        </p>
      )}

      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No completed calls yet. Reports appear here automatically once a call ends.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {reports.map((report) => (
            <CallReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
