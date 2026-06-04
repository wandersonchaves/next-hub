import { useAuth } from "../providers/auth-provider";
import { useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000';

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

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }, [getToken, orgId, router, orgSlug]);

  return { fetcher };
}

