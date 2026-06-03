import { useApi } from "./use-api";
import { useState, useEffect, useCallback } from "react";

export type VerticalModule = 'PROSPECTOR' | 'HEALTH' | 'PET' | 'CORE';

export interface TenantConfig {
  organizationId: string;
  isBlocked: boolean;
  status: string;
  activeModules: VerticalModule[];
  plan: string;
  units: { id: string; name: string; type: string }[];
}

/**
 * Hook to manage Tenant-level configuration and active modules.
 * Refactored to avoid calling the deleted '/core/saas-control/config' endpoint.
 * Now it relies on the local state or fallback logic since the boilerplate module was purged.
 */
export function useTenantConfig() {
  const { fetcher } = useApi();
  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      
      // DEPRECATED: The /core/saas-control/config was part of the boilerplate purge.
      // For now, we mock the config or wait for a unified profile/context endpoint.
      // We will assume 'CORE' is always active and let guards handle the rest.
      
      const mockConfig: TenantConfig = {
        organizationId: 'current',
        isBlocked: false,
        status: 'ACTIVE',
        activeModules: ['CORE', 'PROSPECTOR', 'HEALTH', 'PET'], // Let backend guards decide 404/200
        plan: 'PRO',
        units: []
      };

      setConfig(mockConfig);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectUnit = (unitId: string) => {
    localStorage.setItem('x-unit-id', unitId);
    window.dispatchEvent(new Event('storage'));
  };

  const getActiveUnitId = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('x-unit-id');
  };

  return { 
    config, 
    loading, 
    error, 
    refresh: load,
    selectUnit,
    activeUnitId: getActiveUnitId()
  };
}
