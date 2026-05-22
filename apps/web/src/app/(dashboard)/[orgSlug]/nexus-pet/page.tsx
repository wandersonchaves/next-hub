import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Dog, Scissors, RefreshCw, Plus, Users } from "lucide-react";

export default function NexusPetPage({ params }: { params: { orgSlug: string } }) {
  const { orgSlug } = params;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nexus Pet</h1>
          <p className="text-muted-foreground">
            Gestão inteligente para o seu Pet Shop e Banho & Tosa.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${orgSlug}/nexus-pet/pets`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Pet
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Pets"
          value="482"
          trend={{ value: 12, isPositive: true }}
          icon={Dog}
        />
        <StatCard
          title="Serviços Hoje"
          value="28"
          trend={{ value: 5, isPositive: true }}
          icon={Scissors}
        />
        <StatCard
          title="Recorrência (Média)"
          value="14 dias"
          trend={{ value: 2, isPositive: false }}
          icon={RefreshCw}
        />
        <StatCard
          title="Novos Tutores"
          value="32"
          trend={{ value: 8, isPositive: true }}
          icon={Users}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link href={`/${orgSlug}/nexus-pet/pets`} className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-muted hover:border-primary transition-colors gap-2">
              <Dog className="h-8 w-8 text-primary" />
              <span className="font-medium">Gestão de Pets</span>
            </Link>
            <Link href={`/${orgSlug}/nexus-pet/services`} className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-muted hover:border-primary transition-colors gap-2">
              <Scissors className="h-8 w-8 text-primary" />
              <span className="font-medium">Configurar Serviços</span>
            </Link>
          </div>
        </div>
        
        <div className="col-span-3 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Alertas de Reativação</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-orange-50 border border-orange-100">
                <div>
                  <p className="text-sm font-medium text-orange-900">Thor (Golden Retriever)</p>
                  <p className="text-xs text-orange-700 text-muted-foreground">Último banho: há 18 dias</p>
                </div>
                <Button size="sm" variant="outline" className="h-8 text-xs border-orange-200 text-orange-700 hover:bg-orange-100">
                  Reativar
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
