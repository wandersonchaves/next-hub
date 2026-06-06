import { useAuth } from "../providers/auth-provider";
import { useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

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
      // Use standard fetch. Next.js Rewrites will handle the /api -> Gateway mapping
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 402) {
        if (orgSlug) {
          router.push(`/${orgSlug}/billing/suspended`);
        }
        throw new Error('Assinatura Suspensa ou Pendência Financeira');
      }

      // Check for non-JSON responses (Platform errors)
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        if (text.includes("Sincronizando")) {
            throw new Error("O servidor está iniciando. Por favor, aguarde alguns segundos.");
        }
        throw new Error(`Erro inesperado do servidor (Status: ${response.status})`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data as T;

    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error('Erro de conexão ou rede.');
    }
  }, [getToken, orgId, router, orgSlug]);

  return { fetcher };
}
