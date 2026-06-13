import { useState } from "react";
import { useApi } from "./use-api";
import { toast } from "sonner";

export interface HistoricalMessage {
  sender: "LEAD" | "IA";
  content: string;
  createdAt: string;
}

export interface CreateManualLeadData {
  name: string;
  phone: string;
  organizationId: string;
  unitId: string;
  historicalMessages?: HistoricalMessage[];
}

export function useManualLeadMutation() {
  const { fetcher } = useApi();
  const [loading, setLoading] = useState(false);

  const mutate = async (data: CreateManualLeadData, options?: { onSuccess?: () => void }) => {
    setLoading(true);
    try {
      await fetcher("/modules/prospector/leads/manual", {
        method: "POST",
        body: JSON.stringify(data),
      });

      toast.success("Lead cadastrado com sucesso!");
      if (options?.onSuccess) {
        options.onSuccess();
      }
    } catch (err: any) {
      console.error("Failed to register lead manually", err);
      toast.error(err?.message || "Erro ao cadastrar lead manualmente.");
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading };
}
