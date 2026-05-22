import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Calendar, Activity, Settings, Users } from "lucide-react";

export default function NexusHealthPage({ params }: { params: { orgSlug: string } }) {
  const { orgSlug } = params;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nexus Health</h1>
          <p className="text-muted-foreground">
            Gerenciamento operacional da sua clínica de estética.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${orgSlug}/nexus-health/agenda`}>
            <Button>
              <Calendar className="mr-2 h-4 w-4" />
              Ver Agenda
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Agendamentos Hoje"
          value="12"
          trend={{ value: 15, isPositive: true }}
          icon={Calendar}
        />
        <StatCard
          title="Procedimentos Ativos"
          value="24"
          trend={{ value: 5, isPositive: true }}
          icon={Activity}
        />
        <StatCard
          title="Pacientes Novos"
          value="156"
          trend={{ value: 8, isPositive: true }}
          icon={Users}
        />
        <StatCard
          title="Taxa de Comparecimento"
          value="94%"
          trend={{ value: 2, isPositive: false }}
          icon={Settings}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Acesso Rápido</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link href={`/${orgSlug}/nexus-health/agenda`} className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-muted hover:border-primary transition-colors gap-2">
              <Calendar className="h-8 w-8 text-primary" />
              <span className="font-medium">Gestão de Agenda</span>
            </Link>
            <Link href={`/${orgSlug}/nexus-health/procedures`} className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-muted hover:border-primary transition-colors gap-2">
              <Activity className="h-8 w-8 text-primary" />
              <span className="font-medium">Configurar Procedimentos</span>
            </Link>
          </div>
        </div>
        
        <div className="col-span-3 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Próximos Horários</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">Maria Oliveira</p>
                  <p className="text-xs text-muted-foreground">Botox - 14:30</p>
                </div>
                <div className="text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-700">
                  Confirmado
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
