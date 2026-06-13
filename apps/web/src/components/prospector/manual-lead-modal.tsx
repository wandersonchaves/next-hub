"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm, useFieldArray } from "react-hook-form";
import { X, Plus, Trash2, UserPlus, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useManualLeadMutation } from "@/hooks/use-manual-lead-mutation";
import { useAuth } from "@/providers/auth-provider";
import { useTenantConfig } from "@/hooks/use-tenant-config";

interface HistoricalMessage {
  sender: "LEAD" | "IA";
  content: string;
  createdAt: string;
}

interface FormValues {
  name: string;
  phone: string;
  historicalMessages: HistoricalMessage[];
}

interface ManualLeadModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ManualLeadModal({ isOpen, onOpenChange, onSuccess }: ManualLeadModalProps) {
  const { mutate, loading } = useManualLeadMutation();
  const { orgId } = useAuth();
  const { activeUnitId } = useTenantConfig();

  const { register, control, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      name: "",
      phone: "",
      historicalMessages: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "historicalMessages",
  });

  const onSubmit = async (data: FormValues) => {
    const payload = {
      ...data,
      organizationId: orgId || "",
      unitId: activeUnitId || "",
    };
    await mutate(payload, {
      onSuccess: () => {
        reset();
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      },
    });
  };

  React.useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-hidden bg-card border rounded-2xl shadow-2xl z-50 flex flex-col animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="p-6 border-b flex justify-between items-center bg-muted/20">
            <Dialog.Title className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
              <UserPlus className="text-primary" size={20} />
              Novo Lead Manual
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-full transition-colors">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground" htmlFor="name">
                  Nome do Lead
                </label>
                <input
                  {...register("name", { required: true })}
                  id="name"
                  type="text"
                  placeholder="Ex: João Silva"
                  className="w-full px-4 py-2.5 border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground" htmlFor="phone">
                  Telefone / WhatsApp
                </label>
                <input
                  {...register("phone", { required: true })}
                  id="phone"
                  type="text"
                  placeholder="Ex: +5511999999999"
                  className="w-full px-4 py-2.5 border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  required
                />
              </div>
            </div>

            {/* Omnichannel History Context */}
            <div className="space-y-4 pt-2 border-t">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold uppercase tracking-tight flex items-center gap-1.5 text-foreground">
                    <MessageSquare size={16} />
                    Contexto de Mensagens Prévias
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Injete o histórico de mensagens para a IA compreender o contexto omnichannel do lead.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      sender: "LEAD",
                      content: "",
                      createdAt: new Date().toISOString(),
                    })
                  }
                  className="gap-1.5 rounded-xl text-xs h-9 border-primary/20 hover:border-primary hover:bg-primary/5"
                >
                  <Plus size={14} />
                  Adicionar Linha
                </Button>
              </div>

              {fields.length === 0 ? (
                <div className="border border-dashed rounded-2xl p-8 text-center text-muted-foreground text-sm bg-muted/5">
                  Nenhuma mensagem prévia cadastrada. O lead iniciará o fluxo padrão da IA.
                </div>
              ) : (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {fields.map((field, index) => {
                    const sender = watch(`historicalMessages.${index}.sender`);
                    return (
                      <div
                        key={field.id}
                        className="p-4 border rounded-xl bg-muted/10 space-y-3 relative group"
                      >
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">
                            Mensagem #{index + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground mr-1">Remetente:</span>
                            
                            {/* Toggle Sender */}
                            <div className="inline-flex rounded-lg border p-0.5 bg-muted/30">
                              <button
                                type="button"
                                onClick={() => setValue(`historicalMessages.${index}.sender`, "LEAD")}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                                  sender === "LEAD"
                                    ? "bg-green-500 text-white shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                Cliente
                              </button>
                              <button
                                type="button"
                                onClick={() => setValue(`historicalMessages.${index}.sender`, "IA")}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                                  sender === "IA"
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                IA (Agente)
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <textarea
                          {...register(`historicalMessages.${index}.content`, { required: true })}
                          placeholder="Digite o conteúdo da mensagem..."
                          className="w-full px-3 py-2 border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all min-h-[60px] resize-y"
                          required
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t flex justify-end gap-3 bg-card">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" className="rounded-xl" disabled={loading}>
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button type="submit" className="rounded-xl gap-2 min-w-[120px]" disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                {loading ? "Cadastrando..." : "Cadastrar Lead"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
