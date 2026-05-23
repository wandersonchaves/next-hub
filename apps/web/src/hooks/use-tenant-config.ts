import { useApi } from "./use-api";
import { useState, useEffect } from "react";

export type VerticalModule = 'PROSPECTOR' | 'HEALTH' | 'PET' | 'CORE';

export interface TenantConfig {
  organizationId: string;
  isBlocked: boolean;
  activeModules: VerticalModule[];
  plan: string;
}

export function useTenantConfig() {
  const { fetcher } = useApi();
  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const data = await fetcher<TenantConfig>('/core/saas-control/config');
        if (isMounted) setConfig(data);
      } catch (err) {
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => { isMounted = false; };
  }, [fetcher]);

  return { config, loading, error };
}
