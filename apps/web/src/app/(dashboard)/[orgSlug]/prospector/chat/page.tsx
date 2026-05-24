"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StateBadge, ProspectorState } from "@/components/prospector/state-badge";
import { ROICalculator } from "@/components/prospector/roi-calculator";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { 
  Search, 
  Send, 
  User, 
  MoreVertical, 
  Phone, 
  AlertCircle,
  Zap,
  MessageSquare,
  Loader2,
  RefreshCw,
  Sparkles
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
}

export default function ProspectorChatPage() {
  const searchParams = useSearchParams();
  const leadIdFromUrl = searchParams.get('id');
  const { fetcher } = useApi();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loadingLeads, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [generating, setGenerateLoading] = useState(false);
  const [inputText, setInputText] = useState("");

  const loadData = useCallback(async (leadId?: string) => {
    try {
      const response = await fetcher<{ leads: Lead[] }>('/modules/prospector/leads');
      setLeads(response.leads);
      
      const targetId = leadId || leadIdFromUrl || selectedLead?.id;
      if (targetId) {
        const found = response.leads.find(l => l.id === targetId);
        if (found) setSelectedLead(found);
      }
    } catch (err) {
      console.error("Failed to load leads", err);
    } finally {
      setLoading(false);
    }
  }, [fetcher, leadIdFromUrl, selectedLead?.id]);

  useEffect(() => {
    loadData();

    // Polling de 5 segundos para simular tempo real
    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedLead?.interactions]);

  const handleSendMessage = async () => {
    if (!selectedLead || !inputText.trim()) return;
    setSending(true);
    try {
      // Endpoint simplificado para envio direto (manual ou assistido)
      await fetcher(`/modules/prospector/leads/${selectedLead.id}/send-message`, {
        method: 'POST',
        body: JSON.stringify({ text: inputText })
      });
      setInputText("");
      await loadData(selectedLead.id);
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setSending(false);
    }
  };

  const handleGeneratePitch = async () => {
    if (!selectedLead) return;
    setGenerateLoading(true);
    try {
      const res = await fetcher<{ suggestion: string }>(`/modules/prospector/leads/${selectedLead.id}/generate-pitch`, {
        method: 'POST'
      });
      // Injeta diretamente no input para edição
      setInputText(res.suggestion);
      // Atualiza os dados do lead (nome, e-mail etc que a IA pode ter extraído)
      await loadData(selectedLead.id);
    } catch (err) {
      console.error("Generation failed", err);
    } finally {
      setGenerateLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] border rounded-2xl bg-card overflow-hidden shadow-2xl">
      {/* Sidebar: Leads List */}
      <div className="w-80 border-r flex flex-col bg-muted/10">
        <div className="p-4 border-b space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-black uppercase tracking-tight text-sm flex items-center gap-2">
              <Zap size={16} className="text-primary" />
              Pipeline
            </h2>
            <Button variant="ghost" size="icon" onClick={() => loadData()} className="h-6 w-6">
              <RefreshCw size={14} className={cn(loadingLeads && "animate-spin")} />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="w-full pl-9 pr-4 py-2 border rounded-xl bg-background text-xs outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {leads.map((lead) => (
            <div 
              key={lead.id} 
              className={`p-4 border-b cursor-pointer transition-all hover:bg-muted/50 ${selectedLead?.id === lead.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
              onClick={() => {
                setSelectedLead(lead);
                setInputText("");
              }}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-sm truncate">{lead.name}</span>
                <span className="text-[10px] text-muted-foreground italic">
                  {lead.interactions?.[0] ? new Date(lead.interactions[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Novo'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate mb-2">{lead.industry || 'Lead Descoberto'}</p>
              <div className="flex justify-between items-center">
                <StateBadge state={lead.status as ProspectorState} className="text-[8px] px-1.5" />
                <span className={cn("text-[10px] font-black", lead.score > 70 ? 'text-green-600' : 'text-primary')}>
                  Score: {lead.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main: Chat History */}
      <div className="flex-1 flex flex-col relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
        {selectedLead ? (
          <>
            {/* Header */}
            <div className="p-4 border-b bg-background/80 backdrop-blur-md flex justify-between items-center z-10 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 font-black">
                  {selectedLead.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-none">{selectedLead.name}</h3>
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    <Phone size={10} /> {selectedLead.phone}
                    {selectedLead.email && <span className="ml-2 border-l pl-2">✉ {selectedLead.email}</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs gap-2 border-primary/20 hover:bg-primary/5">
                  <AlertCircle size={14} /> Intervir
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical size={16} />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedLead.interactions?.slice().reverse().map((msg) => (
                <div key={msg.id} className={`flex ${msg.type === 'INBOUND' ? 'justify-start' : 'justify-end'}`}>
                  <div className={cn(
                    "max-w-[70%] rounded-2xl p-4 shadow-sm relative",
                    msg.type === 'INBOUND' ? 'bg-background border rounded-tl-none' : 'bg-primary text-primary-foreground rounded-tr-none'
                  )}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <span className="text-[10px] block mt-2 text-right opacity-60">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              {selectedLead.interactions?.length === 0 && (
                 <div className="h-full flex items-center justify-center text-muted-foreground text-xs italic">
                    Nenhuma interação registrada ainda. Use o Copiloto abaixo.
                 </div>
              )}
            </div>

            {/* Widgets & IA Button */}
            <div className="absolute top-20 right-6 z-20 w-64 space-y-3">
               <ROICalculator potentialValue={1200} />
               <div className="p-3 bg-white/90 backdrop-blur rounded-xl border shadow-xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Status do Lead</p>
                  <StateBadge state={selectedLead.status as ProspectorState} className="w-full justify-center py-1 mb-3" />
                  
                  <Button 
                    onClick={handleGeneratePitch} 
                    disabled={generating}
                    className="w-full gap-2 h-10 text-xs font-black uppercase shadow-lg animate-pulse hover:animate-none"
                  >
                    {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-yellow-400" />}
                    Copiloto: Sugerir Resposta
                  </Button>
               </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-background/80 backdrop-blur-md">
              <div className="flex items-end gap-2 max-w-4xl mx-auto">
                <textarea 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Escreva sua mensagem ou peça uma sugestão ao Copiloto..." 
                  className="flex-1 px-4 py-3 border rounded-2xl bg-muted/30 text-sm outline-none focus:ring-2 focus:ring-primary/50 resize-none min-h-[50px] max-h-48 transition-all"
                  rows={inputText.split('\n').length}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={sending || !inputText.trim()}
                  size="icon" 
                  className="h-12 w-12 rounded-2xl shrink-0 shadow-lg"
                >
                  {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-4">
            <MessageSquare size={64} strokeWidth={1} />
            <p className="font-medium">Selecione um lead no pipeline para iniciar o chat assistido</p>
          </div>
        )}
      </div>
    </div>
  );
}
