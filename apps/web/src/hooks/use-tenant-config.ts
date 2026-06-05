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
 * Refactored to avoid hydration mismatches and obsolete API calls.
 */
export function useTenantConfig() {
  const { fetcher } = useApi();
  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      
      // Mocked for now as per previous cleanup
      const mockConfig: TenantConfig = {
        organizationId: 'current',
        isBlocked: false,
        status: 'ACTIVE',
        activeModules: ['CORE', 'PROSPECTOR', 'HEALTH', 'PET'],
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
    // Hydration-safe initial read of localStorage
    if (typeof window !== 'undefined') {
      setActiveUnitId(localStorage.getItem('x-unit-id'));
    }
  }, [load]);

  const selectUnit = (unitId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('x-unit-id', unitId);
      setActiveUnitId(unitId);
      window.dispatchEvent(new Event('storage'));
    }
  };

  return { 
    config, 
    loading, 
    error, 
    refresh: load,
    selectUnit,
    activeUnitId
  };
}
