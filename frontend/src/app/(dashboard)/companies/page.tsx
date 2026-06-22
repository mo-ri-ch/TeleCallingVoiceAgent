"use client";

import { useEffect } from "react";

import { CompanyCard } from "@/components/companies/company-card";
import { CreateCompanyDialog } from "@/components/companies/create-company-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { useCompanyStore } from "@/store/company-store";

export default function CompaniesPage() {
  const companies = useCompanyStore((state) => state.companies);
  const error = useCompanyStore((state) => state.error);
  const loadCompanies = useCompanyStore((state) => state.loadCompanies);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description="Manage company profiles, voice agents, and knowledge bases."
        actions={<CreateCompanyDialog />}
      />

      {error && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => (
          <CompanyCard key={company.id} company={company} />
        ))}
      </div>
    </div>
  );
}
