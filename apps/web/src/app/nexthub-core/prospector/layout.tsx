"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function ProspectorSyncGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { getToken, orgId } = useAuth();

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    let isCancelled = false;

    const connectSSE = async () => {
      try {
        const token = await getToken();
        if (isCancelled) return;
        if (!token) return;

        const unitId = typeof window !== 'undefined' ? localStorage.getItem('x-unit-id') || '' : '';
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
        
        const url = `${apiBase}/modules/prospector/sse?token=${encodeURIComponent(token)}&organizationId=${encodeURIComponent(orgId || '')}&unitId=${encodeURIComponent(unitId)}`;
        
        eventSource = new EventSource(url);

        if (isCancelled) {
          eventSource.close();
          return;
        }

        eventSource.onmessage = () => {
          if (isCancelled) return;
          router.refresh();
        };

        eventSource.onerror = () => {
          if (isCancelled) return;
          eventSource?.close();
          retryTimeout = setTimeout(connectSSE, 5000);
        };
      } catch (err) {
        console.error("Failed to setup SSE in Layout Guard", err);
      }
    };

    connectSSE();

    const interval = setInterval(() => {
      router.refresh();
    }, 10000);

    return () => {
      isCancelled = true;
      if (eventSource) eventSource.close();
      if (retryTimeout) clearTimeout(retryTimeout);
      clearInterval(interval);
    };
  }, [router, getToken, orgId]);

  return <>{children}</>;
}

export default function ProspectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ProspectorSyncGuard>{children}</ProspectorSyncGuard>
    </QueryClientProvider>
  );
}
