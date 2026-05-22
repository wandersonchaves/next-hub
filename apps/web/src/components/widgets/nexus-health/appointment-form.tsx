"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";

interface AppointmentFormProps {
  onClose: () => void;
  onSuccess: () => void;
  branchId: string;
}

export function AppointmentForm({ onClose, onSuccess, branchId }: AppointmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title"),
      leadId: formData.get("leadId"),
      procedureId: formData.get("procedureId"),
      startTime: formData.get("startTime"),
    };

    try {
      // Aqui integrariamos com o service apiRequest
      console.log("Saving appointment...", data);
      
      // Simular delay da rede
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar agendamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background w-full max-w-md rounded-xl border shadow-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Novo Agendamento</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded bg-destructive/10 text-destructive text-sm border border-destructive/20">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">Título do Agendamento</label>
            <input
              id="title"
              name="title"
              required
              className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary/50 outline-none"
              placeholder="Ex: Paciente Maria - Botox"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="procedureId" className="text-sm font-medium">Procedimento</label>
              <select id="procedureId" name="procedureId" required className="w-full px-3 py-2 border rounded-md bg-background outline-none">
                <option value="">Selecione...</option>
                <option value="1">Botox</option>
                <option value="2">Preenchimento</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="leadId" className="text-sm font-medium">Paciente (Lead)</label>
              <select id="leadId" name="leadId" required className="w-full px-3 py-2 border rounded-md bg-background outline-none">
                <option value="">Selecione...</option>
                <option value="lead-1">Maria Silva</option>
                <option value="lead-2">João Oliveira</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="startTime" className="text-sm font-medium">Data e Hora de Início</label>
            <input
              id="startTime"
              name="startTime"
              type="datetime-local"
              required
              className="w-full px-3 py-2 border rounded-md bg-background outline-none"
            />
          </div>

          <div className="pt-4 flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
