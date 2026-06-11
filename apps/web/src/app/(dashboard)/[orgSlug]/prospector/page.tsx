"use client";

import { StatCard } from "@/components/ui/stat-card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StateBadge, ProspectorState } from "@/components/prospector/state-badge";
import { ProactiveSearchWidget } from "@/components/prospector/proactive-search-widget";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/use-api";
import { useAuth } from "@/providers/auth-provider";
import { useState, useEffect, useCallback } from "react";
import { 
  Users, 
  MessageSquare, 
  CalendarCheck, 
  TrendingUp, 
  Search,
  ChevronRight,
  RefreshCw
} from "lucide-react";

interface Lead {
  id: string;
  name: string;
  phone: string;
  status: ProspectorState | string;
  score: number;
  lastInteractionAt: string;
}

export default function ProspectorDashboard({ params }: { params: { orgSlug: string } }) {
  const { orgSlug } = params;
  const { fetcher } = useApi();
  const { getToken, orgId } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadLeads = useCallback(async () => {
    try {
      const response = await fetcher<{ leads: Lead[] }>('/modules/prospector/leads');
      setLeads(response.leads);
    } catch (err) {
      console.error("Failed to load leads", err);
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;

    const connectSSE = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const unitId = typeof window !== 'undefined' ? localStorage.getItem('x-unit-id') || '' : '';
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
        
        const url = `${apiBase}/modules/prospector/sse?token=${encodeURIComponent(token)}&organizationId=${encodeURIComponent(orgId || '')}&unitId=${encodeURIComponent(unitId)}`;
        
        eventSource = new EventSource(url);

        eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            const { leadId, status, scoreIA } = parsed;
            if (leadId) {
              setLeads((prevLeads) =>
                prevLeads.map((l) =>
                  l.id === leadId
                    ? { ...l, status, score: scoreIA, lastInteractionAt: new Date().toISOString() }
                    : l
                )
              );
            }
          } catch (e) {
            console.error("Error parsing SSE message:", e);
          }
        };

        eventSource.onerror = (err) => {
          console.warn("SSE connection error, retrying in 5 seconds...", err);
          eventSource?.close();
          retryTimeout = setTimeout(connectSSE, 5000);
        };
      } catch (err) {
        console.error("Failed to setup SSE", err);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [getToken, orgId]);

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
      render: (val: string) => <StateBadge state={val as ProspectorState} />
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
      accessorKey: "lastInteractionAt" as keyof Lead,
      render: (val: string) => <span className="text-xs text-muted-foreground">{val ? new Date(val).toLocaleDateString() : 'N/A'}</span>
    },
    {
      header: "",
      accessorKey: "id" as keyof Lead,
      render: (val: string) => (
        <div className="flex justify-end">
          <Link href={`/${orgSlug}/prospector/chat/${val}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-full">
              <ChevronRight size={16} />
            </Button>
          </Link>
        </div>
      )
    }
  ];

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.phone.includes(searchTerm)
  );

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
          <Button variant="outline" size="icon" onClick={() => loadLeads()} disabled={loading} className="rounded-xl">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Link href={`/${orgSlug}/prospector/chat`}>
            <Button className="gap-2 rounded-xl shadow-lg border-primary/20" variant="outline">
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
            value={leads.length.toString()}
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
        <ProactiveSearchWidget onSuccess={() => {
          setTimeout(loadLeads, 2000); // Wait for BullMQ to process first leads
        }} />
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filteredLeads}
        />
      </div>
    </div>
  );
}
