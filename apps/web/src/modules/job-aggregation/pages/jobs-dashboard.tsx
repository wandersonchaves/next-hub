import React from "react";
import { SyncTriggerButton } from "../components/sync-trigger-button";
import { JobManifestationTable } from "../components/job-manifestation-table";
import { useAuth } from "@/providers/auth-provider";
import { Briefcase, Layers, CheckCircle } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

export default function JobsDashboard() {
  const { orgId } = useAuth();

  if (!orgId) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Nenhuma organização ativa encontrada. Por favor selecione uma organização.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase italic text-foreground">
            Painel de Vagas
          </h1>
          <p className="text-muted-foreground">
            Gerencie e sincronize vagas agregadas de provedores externos (Greenhouse, Lever).
          </p>
        </div>
        <SyncTriggerButton organizationId={orgId} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard
          title="Vagas Agregadas"
          value="Calculando..."
          icon={Briefcase}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Provedores Ativos"
          value="2"
          icon={Layers}
          trend={{ value: 0, isPositive: true }}
        />
        <StatCard
          title="Status de Ingestão"
          value="Ativo"
          icon={CheckCircle}
          trend={{ value: 100, isPositive: true }}
        />
      </div>

      <JobManifestationTable organizationId={orgId} />
    </div>
  );
}
