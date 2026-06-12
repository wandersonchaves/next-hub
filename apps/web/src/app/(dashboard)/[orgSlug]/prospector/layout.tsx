"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";

function ProspectorSyncGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { getToken, orgId } = useAuth();

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;

    const connectSSE = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const unitId = typeof window !== 'undefined' ? localStorage.getItem('x-unit-id') || '' : '';
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
        
        const url = `${apiBase}/modules/prospector/sse?token=${encodeURIComponent(token)}&organizationId=${encodeURIComponent(orgId || '')}&unitId=${encodeURIComponent(unitId)}`;
        
        eventSource = new EventSource(url);

        eventSource.onmessage = () => {
          // Trigger route refresh on any real-time update/mutation from the server
          router.refresh();
        };

        eventSource.onerror = () => {
          eventSource?.close();
          retryTimeout = setTimeout(connectSSE, 5000);
        };
      } catch (err) {
        console.error("Failed to setup SSE in Layout Guard", err);
      }
    };

    connectSSE();

    // Fallback polling to ensure state reconciliation
    const interval = setInterval(() => {
      router.refresh();
    }, 10000);

    return () => {
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
  return <ProspectorSyncGuard>{children}</ProspectorSyncGuard>;
}
