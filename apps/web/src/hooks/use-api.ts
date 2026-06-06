import { useAuth } from "../providers/auth-provider";
import { useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export function useApi() {
  const { getToken, orgId, logout } = useAuth();
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
      headers.set('x-company-id', orgId); 
    }

    // Inject Unit ID if present in localStorage
    if (typeof window !== 'undefined') {
      const unitId = localStorage.getItem('x-unit-id');
      if (unitId && !headers.has('x-unit-id')) {
        headers.set('x-unit-id', unitId);
      }
    }

    // 1. TIMEOUT CONTROLLER: Give the API enough time for heavy tasks (AI/Scraping)
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 120000); // 120 seconds

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(id);

      // Handle Authentication Issues (Token invalid, expired or Secret mismatch)
      if (response.status === 401) {
        console.warn(`[useApi] 401 Unauthorized at ${endpoint}. Logging out.`);
        logout(); 
        router.push('/login');
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }

      if (response.status === 402) {
        if (orgSlug) {
          router.push(`/${orgSlug}/billing/suspended`);
        }
        throw new Error('Assinatura Suspensa ou Pendência Financeira');
      }

      // 504 Gateway Timeout or 502 Bad Gateway
      if (response.status === 504 || response.status === 502) {
         const errorText = await response.text();
         console.error(`[useApi] ${response.status} Error at ${endpoint}:`, errorText);
         
         try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.message || "O servidor demorou muito para responder.");
         } catch (e) {
            throw new Error("O servidor demorou muito para responder. Isso pode ocorrer durante o início da aplicação ou em buscas complexas.");
         }
      }

      // Check for non-JSON responses
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        if (text.includes("Sincronizando")) {
            throw new Error("O servidor está iniciando. Por favor, aguarde 30 segundos e tente novamente.");
        }
        if (response.status === 404) {
            throw new Error(`Recurso não encontrado (${endpoint})`);
        }
        throw new Error(`Erro inesperado do servidor (Status: ${response.status})`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data as T;

    } catch (error: any) {
      clearTimeout(id);
      if (error.name === 'AbortError') {
        throw new Error('A requisição demorou demais e foi cancelada. Tente novamente.');
      }
      if (error instanceof Error) throw error;
      throw new Error('Erro de conexão ou rede.');
    }
  }, [getToken, orgId, router, orgSlug, logout]);

  return { fetcher };
}
