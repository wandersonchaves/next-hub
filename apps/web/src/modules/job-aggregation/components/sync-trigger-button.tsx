import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface SyncTriggerButtonProps {
  organizationId: string;
}

export function SyncTriggerButton({ organizationId }: SyncTriggerButtonProps) {
  const { fetcher } = useApi();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      return fetcher<any>(`/v1/organizations/${organizationId}/jobs/sync`, {
        method: "POST",
        body: JSON.stringify({ limit: 100 }),
      });
    },
    onSuccess: () => {
      toast.success("Sincronização de vagas iniciada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["jobs", organizationId] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao iniciar sincronização: ${error.message}`);
    },
  });

  return (
    <Button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="gap-2 rounded-xl shadow-lg border-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground"
    >
      <RefreshCw className={`h-4 w-4 ${mutation.isPending ? "animate-spin" : ""}`} />
      {mutation.isPending ? "Sincronizando..." : "Sincronizar Vagas"}
    </Button>
  );
}
