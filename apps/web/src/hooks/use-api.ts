import { useAuth } from "../providers/auth-provider";
import { useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export function useApi() {
  const { getToken, orgId, logout } = useAuth();
  const router = useRouter();
  const params = useParams() || {};
  const orgSlug = params.orgSlug as string | undefined;

  /**
   * Refactored fetcher to strictly intercept headers and safely parse JSON.
   * Eliminates 401 errors and "Unexpected token N" crashes.
   */
  const fetcher = useCallback(async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    // 1. SYNCHRONOUS HEADER INTERCEPTION
    const token = await getToken();
    const headers = new Headers(options.headers);
    
    headers.set('Content-Type', 'application/json');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Context injection
    if (orgId && !headers.has('x-organization-id')) {
      headers.set('x-organization-id', orgId);
      headers.set('x-company-id', orgId); 
    }

    if (typeof window !== 'undefined') {
      const unitId = localStorage.getItem('x-unit-id');
      if (unitId && !headers.has('x-unit-id')) {
        headers.set('x-unit-id', unitId);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min guard

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // 2. SAFE EXCEPTION HANDLING
      if (response.status === 401) {
        console.error(`[Security] 401 Unauthorized at ${endpoint}. Forcing session sync.`);
        logout(); 
        router.push('/login');
        throw new Error('Acesso negado: Sessão expirada ou inválida.');
      }

      // Read as text to prevent "Unexpected token" crashes
      const responseText = await response.text();

      // Detection of raw platform strings (like "NextHub..." or "Not Authorized")
      // that trigger the "Unexpected token N" syntax error.
      const isHtmlOrText = responseText.trim().startsWith("<") || 
                           responseText.trim().startsWith("N") ||
                           !responseText.trim().startsWith("{");

      if (isHtmlOrText || !response.headers.get("content-type")?.includes("application/json")) {
         if (response.status >= 500) {
            throw new Error("O servidor está temporariamente indisponível. Tente novamente em alguns instantes.");
         }
         if (response.status === 404) {
            throw new Error(`Endpoint não localizado: ${endpoint}`);
         }
         // Fallback safe parse
         return { message: "Unexpected server response", raw: responseText } as any;
      }

      // SAFE JSON PARSE
      try {
        const data = JSON.parse(responseText);
        
        if (!response.ok) {
          throw new Error(data.message || 'API request failed');
        }

        return data as T;
      } catch (parseError) {
        console.error("[JSON Error] Could not parse server response:", responseText);
        throw new Error("Erro de processamento nos dados do servidor.");
      }

    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') throw new Error('A requisição expirou por lentidão na rede.');
      if (error instanceof Error) throw error;
      throw new Error('Erro crítico de comunicação.');
    }
  }, [getToken, orgId, router, orgSlug, logout]);

  return { fetcher };
}
