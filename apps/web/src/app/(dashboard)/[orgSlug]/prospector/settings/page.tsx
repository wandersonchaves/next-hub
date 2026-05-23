"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Bot, 
  Save, 
  Info, 
  Target, 
  DollarSign, 
  Building2,
  BrainCircuit,
  MessageSquare
} from "lucide-react";

export default function ProspectorSettingsPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulation
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight uppercase italic flex items-center gap-3">
          <Bot size={32} className="text-primary" />
          Configurações do Robô SDR
        </h1>
        <p className="text-muted-foreground mt-2">
          Ajuste as diretrizes de inteligência e o tom de voz do seu prospector automático.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-20">
        {/* Pitch de Vendas */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-lg uppercase tracking-tight">
            <MessageSquare size={20} className="text-primary" />
            Pitch de Vendas & Tom de Voz
          </div>
          <p className="text-xs text-muted-foreground italic bg-muted/30 p-3 rounded-lg border-l-4 border-primary">
            <Info size={14} className="inline mr-1 -mt-0.5" />
            O robô usará este contexto para convencer o lead. Seja direto e foque na dor do cliente.
          </p>
          <textarea 
            className="w-full h-32 p-4 border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Ex: Somos a maior clínica de estética de SP. Nosso botox dura 30% mais que a média..."
            defaultValue="Somos especialistas em rejuvenescimento facial. Utilizamos apenas produtos premium de alta durabilidade. Nosso objetivo é um resultado natural e elegante. Oferecemos avaliação gratuita para novos pacientes."
          />
        </div>

        {/* Ancoragem de ROI */}
        <div className="grid gap-6 md:grid-cols-2">
           <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-bold text-lg uppercase tracking-tight">
                <Target size={20} className="text-emerald-600" />
                Ancoragem de ROI
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Ticket Médio por Lead (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input type="number" className="w-full pl-10 pr-4 py-2 border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/50" defaultValue="1200" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Limite de Banhos (Recorrência)</label>
                  <input type="number" className="w-full px-4 py-2 border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/50" defaultValue="12" />
                </div>
              </div>
           </div>

           <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-bold text-lg uppercase tracking-tight">
                <Building2 size={20} className="text-indigo-600" />
                Direcionamento
              </div>
              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Filial de Atendimento Padrão</label>
                    <select className="w-full px-4 py-2 border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/50">
                       <option>Matriz - São Paulo</option>
                       <option>Unidade Jardins</option>
                       <option>Unidade Alphaville</option>
                    </select>
                 </div>
                 <div className="flex items-center gap-2">
                    <input type="checkbox" id="multi" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" defaultChecked />
                    <label htmlFor="multi" className="text-xs font-medium">Habilitar Upsell Multi-unidades</label>
                 </div>
              </div>
           </div>
        </div>

        {/* Diretrizes da Matriz SDR */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-lg uppercase tracking-tight">
            <BrainCircuit size={20} className="text-primary" />
            Matriz de Estados SDR Sênior
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
             {[
               "Bloqueio de Duplo Agendamento",
               "Tratamento de Negativas",
               "Coleta Obrigatória de E-mail",
               "Simulação de Digitação Humana",
               "Pausa Automática em Intervenção",
               "Notificar Dono em Fechamento"
             ].map((item) => (
               <div key={item} className="flex items-center gap-2 p-3 rounded-xl border bg-muted/20">
                  <input type="checkbox" id={item} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" defaultChecked />
                  <label htmlFor={item} className="text-xs font-medium">{item}</label>
               </div>
             ))}
          </div>
        </div>

        <div className="fixed bottom-8 right-8 flex gap-4">
           <Button type="submit" size="lg" className="rounded-full shadow-2xl gap-2 h-14 px-8" disabled={loading}>
              {loading ? <span className="animate-spin mr-1">◌</span> : <Save size={20} />}
              {loading ? "Salvando Alterações..." : "Salvar Configurações"}
           </Button>
        </div>
      </form>
    </div>
  );
}
