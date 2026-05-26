"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StateBadge, ProspectorState } from "@/components/prospector/state-badge";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { 
  Search, 
  Zap, 
  RefreshCw
} from "lucide-react";

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

  const isRecentInbound = (lead: Lead) => {
    const lastMsg = lead.interactions?.[0];
    if (!lastMsg || lastMsg.type !== 'INBOUND') return false;
    
    const diff = Date.now() - new Date(lastMsg.createdAt).getTime();
    return diff < 60000; // Último minuto
  };

  return (
    <div className="grid grid-cols-12 h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      {/* Colunas 1 a 3: Lista de Contatos */}
      <div className="col-span-3 border-r flex flex-col bg-muted/5 h-full overflow-hidden">
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
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredLeads.map((lead) => (
            <Link 
              key={lead.id} 
              href={`/${params.orgSlug}/prospector/chat/${lead.id}`}
              className={cn(
                "block p-4 border-b transition-all hover:bg-muted/30 relative",
                leadId === lead.id ? "bg-primary/5 border-l-4 border-l-primary" : "border-l-4 border-l-transparent"
              )}
            >
              {isRecentInbound(lead) && leadId !== lead.id && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
              )}
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-sm truncate pr-2">{lead.name}</span>
                <span className="text-[9px] font-medium text-muted-foreground whitespace-nowrap uppercase">
                  {lead.interactions?.[0] ? new Date(lead.interactions[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Novo'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate mb-2 italic">
                {lead.industry || 'Nicho não identificado'}
              </p>
              <div className="flex justify-between items-center">
                <StateBadge state={lead.status as ProspectorState} className="text-[8px] px-2 py-0" />
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-black tracking-tighter text-primary">
                    SCORE {lead.score}
                  </span>
                </div>
              </div>
            </Link>
          ))}
          {!loading && filteredLeads.length === 0 && (
             <div className="p-8 text-center text-xs text-muted-foreground italic">Nenhum lead encontrado</div>
          )}
        </div>
      </div>

      {/* Main Content Area (Cols 4 to 12) */}
      <div className="col-span-9 flex flex-col relative h-full overflow-hidden w-full">
        {children}
      </div>
    </div>
  );
}
