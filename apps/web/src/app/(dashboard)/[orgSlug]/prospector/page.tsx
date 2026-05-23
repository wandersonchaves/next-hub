"use client";

import { StatCard } from "@/components/ui/stat-card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StateBadge, ProspectorState } from "@/components/prospector/state-badge";
import { ProactiveSearchWidget } from "@/components/prospector/proactive-search-widget";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { 
  Users, 
  MessageSquare, 
  CalendarCheck, 
  TrendingUp, 
  Search,
  ChevronRight
} from "lucide-react";

interface Lead {
  id: string;
  name: string;
  phone: string;
  status: ProspectorState;
  score: number;
  lastInteraction: string;
}

export default function ProspectorDashboard({ params }: { params: { orgSlug: string } }) {
  const { orgSlug } = params;

  const columns = [
    { 
      header: "Lead", 
      accessorKey: "name" as keyof Lead,
      render: (val: string, item: Lead) => (
        <div className="flex flex-col">
          <span className="font-bold text-sm">{val}</span>
          <span className="text-xs text-muted-foreground">{item.phone}</span>
        </div>
      )
    },
    { 
      header: "Status", 
      accessorKey: "status" as keyof Lead,
      render: (val: ProspectorState) => <StateBadge state={val} />
    },
    { 
      header: "Score IA", 
      accessorKey: "score" as keyof Lead,
      render: (val: number) => (
        <div className="flex items-center gap-2">
          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full",
                val > 80 ? "bg-green-500" : val > 50 ? "bg-yellow-500" : "bg-red-500"
              )} 
              style={{ width: `${val}%` }} 
            />
          </div>
          <span className="text-[10px] font-black">{val}</span>
        </div>
      )
    },
    { 
      header: "Última Interação", 
      accessorKey: "lastInteraction" as keyof Lead,
      render: (val: string) => <span className="text-xs text-muted-foreground">{val}</span>
    },
    {
      header: "",
      accessorKey: "id" as keyof Lead,
      render: (val: string) => (
        <div className="flex justify-end">
          <Link href={`/${orgSlug}/prospector/chat?id=${val}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-full">
              <ChevronRight size={16} />
            </Button>
          </Link>
        </div>
      )
    }
  ];

  const mockLeads: Lead[] = [
    { id: "1", name: "Ricardo Almeida", phone: "+55 11 98888-7777", status: "NEGOTIATION", score: 85, lastInteraction: "Há 5 min" },
    { id: "2", name: "Juliana Costa", phone: "+55 21 97777-6666", status: "BOOKING", score: 92, lastInteraction: "Há 12 min" },
    { id: "3", name: "Marcos Oliveira", phone: "+55 31 96666-5555", status: "QUALIFICATION", score: 45, lastInteraction: "Há 1h" },
    { id: "4", name: "Fernanda Lima", phone: "+55 41 95555-4444", status: "NEGATIVE", score: 10, lastInteraction: "Há 3h" },
    { id: "5", name: "Ana Paula", phone: "+55 51 94444-3333", status: "CONVERTED", score: 100, lastInteraction: "Ontem" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase italic">Nexus Prospector</h1>
          <p className="text-muted-foreground">
            Acompanhe o desempenho da sua força de vendas baseada em IA.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${orgSlug}/prospector/chat`}>
            <Button className="gap-2 rounded-xl shadow-lg">
              <MessageSquare size={16} />
              Abrir Pipeline
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-4 grid-cols-2 md:grid-cols-4">
          <StatCard
            title="Total de Leads"
            value="1.284"
            trend={{ value: 12, isPositive: true }}
            icon={Users}
          />
          <StatCard
            title="Taxa de Conversão"
            value="18.4%"
            trend={{ value: 3.2, isPositive: true }}
            icon={TrendingUp}
          />
          <StatCard
            title="Agendamentos"
            value="156"
            trend={{ value: 8, isPositive: true }}
            icon={CalendarCheck}
          />
          <StatCard
            title="ROI Ancorado"
            value="R$ 42k"
            trend={{ value: 15, isPositive: true }}
            icon={TrendingUp}
          />
        </div>
        <ProactiveSearchWidget onSuccess={() => {}} />
      </div>

      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between bg-muted/20">
          <h2 className="text-xl font-bold uppercase tracking-tight">Leads Ativos</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <input 
                type="text" 
                placeholder="Filtrar leads..." 
                className="pl-9 pr-4 py-1.5 border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={mockLeads}
        />
      </div>
    </div>
  );
}
