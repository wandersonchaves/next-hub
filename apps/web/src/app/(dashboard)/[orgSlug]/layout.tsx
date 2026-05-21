"use client";

import { AppShell } from "@/components/layout/app-shell";

export default function OrganizationDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { orgSlug: string };
}) {
  return (
    <AppShell orgSlug={params.orgSlug}>
      {children}
    </AppShell>
  );
}
