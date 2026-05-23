"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StateBadge, ProspectorState } from "@/components/prospector/state-badge";
import { ROICalculator } from "@/components/prospector/roi-calculator";
import { 
  Search, 
  Send, 
  User, 
  Bot, 
  MoreVertical, 
  Phone, 
  AlertCircle,
  Calendar,
  Zap,
  MessageSquare
} from "lucide-react";

interface Message {
  id: string;
  sender: 'ROBOT' | 'LEAD' | 'USER';
  content: string;
  timestamp: string;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  score: number;
  state: ProspectorState;
}

export default function ProspectorChatPage() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>({
    id: "1",
    name: "Ricardo Almeida",
    phone: "+55 11 98888-7777",
    lastMessage: "Gostaria de saber mais sobre o tratamento.",
    score: 85,
    state: "NEGOTIATION"
  });

  const [messages] = useState<Message[]>([
    { id: "1", sender: "LEAD", content: "Olá, vi o anúncio e gostaria de saber o valor do botox.", timestamp: "14:20" },
    { id: "2", sender: "ROBOT", content: "Olá Ricardo! Tudo bem? Claro, vou te passar todos os detalhes. Antes, me conta: você já realizou algum procedimento estético antes?", timestamp: "14:21" },
    { id: "3", sender: "LEAD", content: "Nunca fiz, seria a primeira vez.", timestamp: "14:25" },
    { id: "4", sender: "ROBOT", content: "Entendido! O botox é excelente para a primeira experiência. Ele suaviza as linhas de expressão de forma muito natural. Para te dar um orçamento exato, preciso saber em qual área você tem mais interesse (testa, entre as sobrancelhas ou pés de galinha)?", timestamp: "14:26" },
  ]);

  return (
    <div className="flex h-[calc(100vh-12rem)] border rounded-2xl bg-card overflow-hidden shadow-2xl">
      {/* Left Column: Leads List */}
      <div className="w-80 border-r flex flex-col bg-muted/10">
        <div className="p-4 border-b space-y-4">
          <h2 className="font-black uppercase tracking-tight text-sm flex items-center gap-2">
            <Zap size={16} className="text-primary" />
            Pipeline Prospector
          </h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <input 
              type="text" 
              placeholder="Buscar conversas..." 
              className="w-full pl-9 pr-4 py-2 border rounded-xl bg-background text-xs outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className={`p-4 border-b cursor-pointer transition-all hover:bg-muted/50 ${selectedLead?.id === String(i) ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
              onClick={() => setSelectedLead({ id: String(i), name: `Lead ${i}`, phone: '+55 11 90000-0000', lastMessage: 'Última mensagem...', score: 70, state: 'GREETING' })}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-sm truncate">Ricardo Almeida</span>
                <span className="text-[10px] text-muted-foreground">14:26</span>
              </div>
              <p className="text-xs text-muted-foreground truncate mb-2">Área de interesse: testa...</p>
              <div className="flex justify-between items-center">
                <StateBadge state={i === 1 ? 'NEGOTIATION' : 'GREETING'} className="text-[8px] px-1.5" />
                <span className={`text-[10px] font-black ${i === 1 ? 'text-green-600' : 'text-primary'}`}>Score: {80 + i}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Chat History */}
      <div className="flex-1 flex flex-col relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
        {selectedLead ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-background/80 backdrop-blur-md flex justify-between items-center z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-none">{selectedLead.name}</h3>
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    <Phone size={10} /> {selectedLead.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs gap-2 border-primary/20 hover:bg-primary/5">
                  <AlertCircle size={14} />
                  Intervir
                </Button>
                <Button size="sm" className="h-8 text-xs gap-2">
                  <Calendar size={14} />
                  Agendar
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical size={16} />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'LEAD' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[70%] rounded-2xl p-4 shadow-sm relative group ${
                    msg.sender === 'LEAD' 
                      ? 'bg-background border rounded-tl-none' 
                      : msg.sender === 'ROBOT' 
                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                        : 'bg-indigo-600 text-white rounded-tr-none'
                  }`}>
                    {msg.sender !== 'LEAD' && (
                      <div className="absolute -left-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {msg.sender === 'ROBOT' ? <Bot size={14} className="text-primary" /> : <User size={14} className="text-indigo-600" />}
                      </div>
                    )}
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <span className={`text-[10px] block mt-2 text-right opacity-60`}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Matrix State Indicator (Floating) */}
            <div className="absolute top-20 right-6 z-20 w-64 animate-in slide-in-from-right duration-500">
               <ROICalculator potentialValue={1200} />
               <div className="mt-2 p-2 bg-white/80 backdrop-blur rounded-lg border text-center">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Estado Atual da Matriz</p>
                  <StateBadge state={selectedLead.state} className="mt-1 w-full justify-center py-1" />
               </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-background/80 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="Digite para intervir na conversa (O robô será pausado)..." 
                  className="flex-1 px-4 py-2 border rounded-xl bg-muted/30 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                />
                <Button size="icon" className="h-10 w-10 rounded-xl">
                  <Send size={18} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-4">
            <MessageSquare size={64} strokeWidth={1} />
            <p className="font-medium">Selecione um lead para visualizar a conversa</p>
          </div>
        )}
      </div>
    </div>
  );
}
