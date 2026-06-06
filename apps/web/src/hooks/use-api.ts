import { useAuth } from "../providers/auth-provider";
import { useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';

export function useApi() {
  const { getToken, orgId } = useAuth();
  const router = useRouter();
  const params = useParams() || {};
  const orgSlug = params.orgSlug as string | undefined;

  const fetcher = useCallback(async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const token = await getToken();

    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (orgId && !headers.has('x-organization-id')) {
      headers.set('x-organization-id', orgId);
      headers.set('x-company-id', orgId); // Support for both aliases
    }

    // Inject Unit ID if present in localStorage
    if (typeof window !== 'undefined') {
      const unitId = localStorage.getItem('x-unit-id');
      if (unitId && !headers.has('x-unit-id')) {
        headers.set('x-unit-id', unitId);
      }
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 402) {
        // Tenant Suspended or Read-Only mutation blocked
        if (orgSlug) {
          router.push(`/${orgSlug}/billing/suspended`);
        }
        throw new Error('Assinatura Suspensa ou Pendência Financeira');
      }

      // 1. Read response as raw text first
      const rawText = await response.text();

      // 2. SANITIZATION: Remove parasite strings like "Sincronizando..." 
      // which might be injected by the gateway during cold starts or middleware logs
      const sanitizedText = rawText.replace(/Sincronizando\.\.\./g, "").trim();

      if (!response.ok) {
        let errorMessage = 'API request failed';
        try {
          const errorJson = JSON.parse(sanitizedText);
          errorMessage = errorJson.message || errorMessage;
        } catch (e) {
          errorMessage = sanitizedText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // 3. SECURE PARSING: Only parse after cleaning the payload
      try {
        return JSON.parse(sanitizedText) as T;
      } catch (parseError) {
        console.error("JSON Parse Error at:", endpoint, "Payload:", sanitizedText);
        throw new Error(`Resposta inválida do servidor (Token error)`);
      }

    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error('Erro de conexão ou rede.');
    }
  }, [getToken, orgId, router, orgSlug]);

  return { fetcher };
}
