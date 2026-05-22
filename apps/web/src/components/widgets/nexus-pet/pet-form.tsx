"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Loader2, Save } from "lucide-react";

interface PetFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function PetForm({ onClose, onSuccess }: PetFormProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    // Simular salvamento
    await new Promise(r => setTimeout(r, 1000));
    
    setLoading(false);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b flex justify-between items-center bg-muted/20">
          <h2 className="text-xl font-bold">Novo Cadastro de Pet</h2>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={loading}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="petName" className="text-sm font-semibold">Nome do Pet</label>
              <input id="petName" required className="w-full px-4 py-2 rounded-xl border bg-background focus:ring-2 focus:ring-primary/40 outline-none transition-all" placeholder="Ex: Mel" />
            </div>
            <div className="space-y-2">
              <label htmlFor="petBreed" className="text-sm font-semibold">Raça</label>
              <input id="petBreed" className="w-full px-4 py-2 rounded-xl border bg-background focus:ring-2 focus:ring-primary/40 outline-none transition-all" placeholder="Ex: Golden" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="petSize" className="text-sm font-semibold">Porte</label>
              <select id="petSize" className="w-full px-3 py-2 rounded-xl border bg-background outline-none focus:ring-2 focus:ring-primary/40">
                <option value="SMALL">Pequeno</option>
                <option value="MEDIUM">Médio</option>
                <option value="LARGE">Grande</option>
                <option value="GIANT">Gigante</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="petWeight" className="text-sm font-semibold">Peso (kg)</label>
              <input id="petWeight" type="number" step="0.1" className="w-full px-4 py-2 rounded-xl border bg-background focus:ring-2 focus:ring-primary/40 outline-none" />
            </div>
            <div className="space-y-2 text-center">
              <label className="text-sm font-semibold block mb-2">Gênero</label>
              <div className="flex justify-center gap-2">
                <button type="button" className="p-2 rounded-lg border hover:bg-blue-50 text-blue-600">♂</button>
                <button type="button" className="p-2 rounded-lg border hover:bg-pink-50 text-pink-600">♀</button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="tutorSearch" className="text-sm font-semibold">Vincular Tutor</label>
            <input id="tutorSearch" required className="w-full px-4 py-2 rounded-xl border bg-background focus:ring-2 focus:ring-primary/40 outline-none" placeholder="Buscar por nome ou CPF..." />
          </div>

          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 rounded-xl gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {loading ? "Salvando..." : "Salvar Pet"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
