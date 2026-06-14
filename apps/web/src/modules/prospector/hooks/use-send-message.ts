import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { toast } from "sonner";

export interface UseSendMessageOptions {
  onMutate?: (text: string) => any;
  onError?: (err: any, text: string, context: any) => void;
  onSettled?: () => void;
  onSuccess?: () => void;
}

export function useSendMessage() {
  const { fetcher } = useApi();
  const [loading, setLoading] = useState(false);

  const mutate = async (
    { leadId, text }: { leadId: string; text: string },
    options?: UseSendMessageOptions
  ) => {
    setLoading(true);
    let context: any = null;

    if (options?.onMutate) {
      try {
        context = await options.onMutate(text);
      } catch (mutateErr) {
        console.error("Error in onMutate callback:", mutateErr);
      }
    }

    try {
      await fetcher(`/modules/prospector/leads/${leadId}/send-message`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });

      if (options?.onSuccess) {
        options.onSuccess();
      }
    } catch (err: any) {
      console.error("Failed to send message via hook:", err);
      toast.error(err?.message || "Erro ao enviar mensagem.");
      
      if (options?.onError) {
        options.onError(err, text, context);
      }
    } finally {
      setLoading(false);
      if (options?.onSettled) {
        options.onSettled();
      }
    }
  };

  return { mutate, loading };
}
