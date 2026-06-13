import { useState } from "react";
import { useApi } from "./use-api";
import { useAuth } from "../providers/auth-provider";
import { toast } from "sonner";

export interface HistoricalMessage {
  sender: "LEAD" | "IA";
  content: string;
  createdAt: string;
}

export interface CreateManualLeadData {
  name: string;
  phone: string;
  historicalMessages?: HistoricalMessage[];
}

export function useManualLeadMutation() {
  const { fetcher } = useApi();
  const { orgId } = useAuth();
  const [loading, setLoading] = useState(false);

  const mutate = async (data: CreateManualLeadData, options?: { onSuccess?: () => void }) => {
    setLoading(true);
    try {
      const unitId = typeof window !== "undefined" ? localStorage.getItem("x-unit-id") || "" : "";
      
      if (!orgId) {
        throw new Error("Organização não identificada.");
      }

      await fetcher("/api/modules/prospector/leads/manual", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          organizationId: orgId,
          unitId,
        }),
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
