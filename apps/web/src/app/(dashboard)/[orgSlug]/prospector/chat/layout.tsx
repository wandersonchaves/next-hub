"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StateBadge, ProspectorState } from "@/components/prospector/state-badge";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { LeadsList } from "@/components/prospector/leads-list";
import { Search, Zap, RefreshCw } from "lucide-react";

interface Interaction {
  id: string;
  type: 'INBOUND' | 'OUTBOUND';
  content: string;
  createdAt: string;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  status: string;
  score: number;
  industry?: string;
  lastInteractionAt: string;
  interactions: Interaction[];
  isPending?: boolean;
}

export default function ProspectorChatLayout({ 
  children,
  params 
}: { 
  children: React.ReactNode;
  params: { orgSlug: string; leadId?: string };
}) {
  const { leadId } = useParams() as { leadId?: string };
  const { fetcher } = useApi();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadLeads = useCallback(async () => {
    try {
      const response = await fetcher<{ leads: Lead[] }>('/modules/prospector/leads');
      // A API já retorna ordenado por lastInteractionAt DESC
      setLeads(response.leads);
    } catch (err) {
      console.error("Failed to load leads", err);
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    loadLeads();
    const interval = setInterval(loadLeads, 5000); // Polling mais rápido para refletir ordenação
    return () => clearInterval(interval);
  }, [loadLeads]);

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.phone.includes(searchTerm)
  );

  return (
    <div className="grid grid-cols-12 h-[100dvh] w-full overflow-hidden bg-background">
      {/* Colunas 1 a 3: Lista de Contatos */}
      <div className="hidden md:flex md:col-span-3 border-r flex-col bg-muted/5 h-full overflow-hidden">
        <div className="p-4 border-b space-y-4 bg-background shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="font-black uppercase tracking-tight text-xs flex items-center gap-2 text-primary">
              <Zap size={14} fill="currentColor" />
              Pipeline Ativo
            </h2>
            <Button variant="ghost" size="icon" onClick={() => loadLeads()} className="h-7 w-7 rounded-full">
              <RefreshCw size={12} className={cn(loading && "animate-spin")} />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-xl bg-muted/20 text-xs outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
        </div>
        
        <LeadsList 
          leads={filteredLeads} 
          activeLeadId={leadId} 
          orgSlug={params.orgSlug} 
          loading={loading} 
        />
      </div>

      {/* Main Content Area (Cols 4 to 12) */}
      <div className="col-span-12 md:col-span-9 flex flex-col relative h-full overflow-hidden w-full">
        {children}
      </div>
    </div>
  );
}
