"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Target, MapPin, Send } from "lucide-react";
import { useApi } from "@/hooks/use-api";

interface ProactiveSearchProps {
  onSuccess: () => void;
}

export function ProactiveSearchWidget({ onSuccess }: ProactiveSearchProps) {
  const [loading, setLoading] = useState(false);
  const [sector, setSector] = useState("");
  const [region, setRegion] = useState("");
  const { fetcher } = useApi();

  const handleStart = async () => {
    if (!sector || !region) return;
    
    setLoading(true);
    try {
      await fetcher('/modules/prospector/source', {
        method: 'POST',
        body: JSON.stringify({ sector, region }),
      });
      onSuccess();
      setSector("");
      setRegion("");
    } catch (err) {
      console.error("Failed to start proactive search", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-primary/5 to-transparent p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2 font-black uppercase tracking-tighter text-primary">
        <Target size={20} />
        Iniciar Prospecção Proativa
      </div>
      <p className="text-xs text-muted-foreground italic">
        Iremos buscar empresas no Google Maps e iniciar o primeiro contato via IA automaticamente.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="relative">
          <Target className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <input 
            type="text" 
            placeholder="Setor (ex: Dentistas)" 
            className="w-full pl-9 pr-4 py-2 border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/50"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          />
        </div>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <input 
            type="text" 
            placeholder="Região (ex: Jardins, SP)" 
            className="w-full pl-9 pr-4 py-2 border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/50"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
        </div>
      </div>

      <Button 
        className="w-full rounded-xl gap-2 h-11" 
        disabled={loading || !sector || !region}
        onClick={handleStart}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        {loading ? "Semeando Leads..." : "Começar a Prospectar"}
      </Button>
    </div>
  );
}
