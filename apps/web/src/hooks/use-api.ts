import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useApi() {
  const { getToken, orgId } = useAuth();

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
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }, [getToken, orgId]);

  return { fetcher };
}
