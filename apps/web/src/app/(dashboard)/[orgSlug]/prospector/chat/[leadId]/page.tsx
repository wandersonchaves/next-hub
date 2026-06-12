"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StateBadge, ProspectorState } from "@/components/prospector/state-badge";
import { ROICalculator } from "@/components/prospector/roi-calculator";
import { ChatInput } from "@/components/prospector/chat-input";
import { LeadsList } from "@/components/prospector/leads-list";
import { useApi } from "@/hooks/use-api";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { 
  Send, 
  User, 
  MoreVertical, 
  Phone, 
  AlertCircle,
  Loader2,
  Sparkles,
  Zap,
  Mail,
  Target,
  TrendingUp,
  Menu,
  X,
  Search,
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
  email?: string;
  interactions: Interaction[];
  lastInteractionAt?: string;
  isPending?: boolean;
}

export default function LeadChatPage() {
  const { leadId, orgSlug } = useParams() as { leadId: string; orgSlug: string };
  const { fetcher } = useApi();
  const router = useRouter();
  const { getToken, orgId } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [lead, setLead] = useState<Lead | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const loadLead = useCallback(async () => {
    try {
      const response = await fetcher<{ leads: Lead[] }>('/modules/prospector/leads');
      setLeads(response.leads);
      const found = response.leads.find(l => l.id === leadId);
      if (found) setLead(found);
    } catch (err) {
      console.error("Failed to load lead", err);
    } finally {
      setLoading(false);
    }
  }, [fetcher, leadId]);

  useEffect(() => {
    loadLead();
    const interval = setInterval(loadLead, 5000); 
    return () => clearInterval(interval);
  }, [loadLead]);

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
            const { leadId: updatedLeadId, type, newLeadId } = parsed;
            
            if (updatedLeadId === leadId) {
              if (type === 'CLEAR_CHAT_VIEW' && newLeadId) {
                // Force clearing message array
                setLead(prev => prev ? { ...prev, interactions: [] } : null);
                // Redirect to new decisor lead
                router.push(`/${orgSlug}/prospector/chat/${newLeadId}`);
                return;
              }
              loadLead();
              router.refresh();
            }
          } catch (e) {
            console.error("Error parsing SSE message in Chat:", e);
          }
        };

        eventSource.onerror = (err) => {
          console.warn("SSE connection error in Chat, retrying in 5 seconds...", err);
          eventSource?.close();
          retryTimeout = setTimeout(connectSSE, 5000);
        };
      } catch (err) {
        console.error("Failed to setup SSE in Chat", err);
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
  }, [getToken, orgId, leadId, orgSlug, loadLead, router]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lead?.interactions]);

  const handleSendMessage = async () => {
    if (!lead || !inputText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await fetcher(`/modules/prospector/leads/${lead.id}/send-message`, {
        method: 'POST',
        body: JSON.stringify({ text: inputText })
      });
      setInputText("");
      await loadLead();
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGeneratePitch = async () => {
    if (!lead || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetcher<{ suggestion: string }>(`/modules/prospector/leads/${lead.id}/generate-pitch`, {
        method: 'POST'
      });
      setInputText(res.suggestion);
      await loadLead();
    } catch (err) {
      console.error("Generation failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [leadId]);

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.phone.includes(searchTerm)
  );

  if (loading && !lead) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/5">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/5">
        <p className="text-muted-foreground italic font-medium">Lead não encontrado</p>
      </div>
    );
  }

  return (
    <div className="flex-1 grid grid-cols-9 h-full overflow-hidden">
      {/* Área do Chat Pura (6 Colunas) */}
      <div className="col-span-9 xl:col-span-6 flex flex-col bg-background relative border-r h-full overflow-hidden">
        {/* Header do Chat */}
        <div className="p-4 border-b bg-background/80 backdrop-blur-md flex justify-between items-center z-10 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8 rounded-full"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={16} />
            </Button>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 font-black">
              {lead.name?.charAt(0) || 'L'}
            </div>
            <div>
              <h3 className="font-bold text-sm leading-none">{lead.name || 'Novo Lead'}</h3>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Phone size={10} /> {lead.phone}
                </span>
                {lead.email && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 border-l pl-2">
                    <Mail size={10} /> {lead.email}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <MoreVertical size={16} />
            </Button>
          </div>
        </div>

        {/* Histórico de Mensagens */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/50">
          {lead.interactions?.slice().reverse().map((msg) => (
            <div key={msg.id} className={`flex ${msg.type === 'INBOUND' ? 'justify-start' : 'justify-end'}`}>
              <div className={cn(
                "max-w-[85%] rounded-2xl p-4 shadow-sm relative text-sm leading-relaxed",
                msg.type === 'INBOUND' 
                  ? "bg-background border rounded-tl-none border-slate-200" 
                  : "bg-primary text-primary-foreground rounded-tr-none shadow-primary/20"
              )}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <span className={cn(
                  "text-[9px] block mt-2 text-right opacity-60 font-medium uppercase",
                  msg.type === 'OUTBOUND' ? "text-primary-foreground" : "text-muted-foreground"
                )}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          {lead.interactions?.length === 0 && (
             <div className="h-full flex items-center justify-center text-muted-foreground text-xs italic">
                Aguardando início da conversa estratégica...
             </div>
          )}
        </div>

        {/* Área de Input */}
        <div className="p-4 border-t bg-background shrink-0 mt-auto">
          <ChatInput
            inputText={inputText}
            setInputText={setInputText}
            handleSendMessage={handleSendMessage}
            handleGeneratePitch={handleGeneratePitch}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>

      {/* Painel Executivo (3 Colunas) */}
      <div className="hidden xl:block xl:col-span-3 bg-muted/5 p-6 space-y-6 overflow-y-auto custom-scrollbar">
        {/* Lead Score Dinâmico */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Lead Scoring IA</h4>
            <span className={cn(
              "text-[10px] font-black px-2 py-0.5 rounded-full border",
              lead.score > 80 ? "bg-green-100 text-green-700 border-green-200" :
              lead.score > 40 ? "bg-amber-100 text-amber-700 border-amber-200" :
              "bg-rose-100 text-rose-700 border-rose-200"
            )}>
              {lead.score > 80 ? 'HOT' : lead.score > 40 ? 'WARM' : 'COLD'}
            </span>
          </div>
          <div className="p-4 bg-background rounded-2xl border shadow-sm space-y-4">
             <div className="flex items-center justify-between mb-1">
                <Target size={18} className="text-primary" />
                <span className="text-2xl font-black italic tracking-tighter text-primary">{lead.score}</span>
             </div>
             <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div 
                   className={cn(
                     "h-full transition-all duration-1000 ease-out",
                     lead.score > 80 ? "bg-green-500" : lead.score > 40 ? "bg-amber-500" : "bg-rose-500"
                   )}
                   style={{ width: `${lead.score}%` }}
                />
             </div>
             <p className="text-[9px] text-muted-foreground italic leading-tight">
                "Este score é calculado em tempo real pela IA baseado no engajamento e intenção de fechamento."
             </p>
          </div>
        </div>

        {/* Governança de Pipeline */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Governança de Pipeline</h4>
          <div className="p-4 bg-background rounded-2xl border shadow-sm space-y-4">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1 font-bold italic">Estágio Atual</p>
              <StateBadge state={lead.status as ProspectorState} className="w-full justify-center py-1.5 text-[10px] rounded-xl font-black italic uppercase" />
            </div>
            
            {lead.status === 'STALE' && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl space-y-2">
                 <div className="flex items-center gap-2 text-rose-700">
                    <AlertCircle size={14} className="shrink-0" />
                    <span className="text-[10px] font-black uppercase italic">Alerta Crítico</span>
                 </div>
                 <p className="text-[10px] text-rose-600 leading-tight">
                    Intervenção humana sugerida. O lead parou de responder ou demonstrou desinteresse.
                 </p>
              </div>
            )}
            
            <Button 
              onClick={handleGeneratePitch} 
              disabled={isSubmitting}
              variant={lead.status === 'STALE' ? 'destructive' : 'default'}
              className={cn(
                "w-full gap-2 h-10 text-[10px] font-black uppercase shadow-lg transition-all rounded-xl",
                (lead.status !== 'STALE' && !isSubmitting) && "animate-pulse hover:animate-none"
              )}
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className={lead.status === 'STALE' ? "text-white" : "text-yellow-400"} />}
              {lead.status === 'STALE' ? 'Sugestão de Retratação' : 'Copiloto: Sugerir Resposta'}
            </Button>
          </div>
        </div>

        {/* Projeção de ROI */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Inteligência Financeira</h4>
          <ROICalculator weeklyVolume={100} averageTicket={150} />
        </div>

        {/* Informações de Nicho */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contexto Operacional</h4>
          <div className="p-4 bg-background rounded-2xl border shadow-sm space-y-3">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                   <Zap size={14} fill="currentColor" />
                </div>
                <div>
                   <p className="text-[10px] text-muted-foreground leading-none mb-1 font-bold uppercase">Setor Normalizado</p>
                   <p className="text-xs font-black text-indigo-900 tracking-tight">{lead.industry}</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation for Active Pipeline */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <div className={cn(
        "fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-background border-r shadow-2xl z-50 md:hidden flex flex-col transition-transform duration-300 ease-in-out",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b space-y-4 bg-background shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="font-black uppercase tracking-tight text-xs flex items-center gap-2 text-primary">
              <Zap size={14} fill="currentColor" />
              Pipeline Ativo
            </h2>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={loadLead} 
                className="h-7 w-7 rounded-full"
              >
                <RefreshCw size={12} className={cn(loading && "animate-spin")} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsMobileMenuOpen(false)} 
                className="h-7 w-7 rounded-full"
              >
                <X size={16} />
              </Button>
            </div>
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
          leads={filteredLeads as any} 
          activeLeadId={leadId} 
          orgSlug={orgSlug} 
          loading={loading} 
        />
      </div>
    </div>
  );
}
