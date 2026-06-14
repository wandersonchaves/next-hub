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
      const data = await fetcher<TenantConfig>('/core/saas-control/config');
      setConfig(data);
      
      // Auto-select first unit if none selected
      if (data.units && data.units.length > 0) {
        const stored = localStorage.getItem('x-unit-id');
        if (!stored || !data.units.some(u => u.id === stored)) {
          localStorage.setItem('x-unit-id', data.units[0].id);
          setActiveUnitId(data.units[0].id);
          window.dispatchEvent(new Event('storage'));
        }
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

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
