import { useApi } from "./use-api";
import { useAuth } from "../providers/auth-provider";
import { useState, useEffect, useCallback, useRef } from "react";

export type VerticalModule = 'PROSPECTOR' | 'HEALTH' | 'PET' | 'CORE';

export interface TenantConfig {
  organizationId: string;
  isBlocked: boolean;
  status: string;
  activeModules: VerticalModule[];
  plan: string;
  units: { id: string; name: string; type: string }[];
}

// Global in-memory cache and in-flight promise deduplicator
let cachedConfig: TenantConfig | null = null;
let cachedOrgId: string | null = null;
let inFlightPromise: Promise<TenantConfig> | null = null;
const listeners = new Set<(config: TenantConfig | null, activeUnitId: string | null) => void>();

function notifyListeners(activeUnitId: string | null) {
  listeners.forEach((listener) => listener(cachedConfig, activeUnitId));
}

/**
 * Hook to manage Tenant-level configuration and active modules.
 * Includes in-memory caching and in-flight request deduplication to prevent
 * request storms to /core/saas-control/config across mounting components.
 */
export function useTenantConfig() {
  const { fetcher } = useApi();
  const { orgId } = useAuth();

  const isMatch = Boolean(orgId && cachedOrgId === orgId && cachedConfig);
  const [config, setConfig] = useState<TenantConfig | null>(isMatch ? cachedConfig : null);
  const [loading, setLoading] = useState(!isMatch);
  const [error, setError] = useState<any>(null);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('x-unit-id');
    }
    return null;
  });

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async (force = false) => {
    // If we already have cached config for the current org and not forcing refresh, reuse it
    if (!force && cachedConfig && cachedOrgId === orgId) {
      setConfig(cachedConfig);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Deduplicate concurrent in-flight requests
      if (!inFlightPromise || force) {
        inFlightPromise = fetcherRef.current<TenantConfig>('/core/saas-control/config');
      }

      const data = await inFlightPromise;
      cachedConfig = data;
      cachedOrgId = orgId || data.organizationId;
      setConfig(data);

      // Auto-select first unit if none selected
      let currentUnit = typeof window !== 'undefined' ? localStorage.getItem('x-unit-id') : null;
      if (data.units && data.units.length > 0) {
        if (!currentUnit || !data.units.some((u) => u.id === currentUnit)) {
          currentUnit = data.units[0].id;
          if (typeof window !== 'undefined') {
            localStorage.setItem('x-unit-id', currentUnit);
          }
        }
      }
      setActiveUnitId(currentUnit);
      notifyListeners(currentUnit);
    } catch (err) {
      setError(err);
    } finally {
      inFlightPromise = null;
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    const updateHandler = (newConfig: TenantConfig | null, newUnitId: string | null) => {
      setConfig(newConfig);
      if (newUnitId !== null) {
        setActiveUnitId(newUnitId);
      }
    };
    listeners.add(updateHandler);

    load(false);

    return () => {
      listeners.delete(updateHandler);
    };
  }, [load]);

  const selectUnit = useCallback((unitId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('x-unit-id', unitId);
    }
    setActiveUnitId(unitId);
    notifyListeners(unitId);
  }, []);

  return {
    config,
    loading,
    error,
    refresh: () => load(true),
    selectUnit,
    activeUnitId,
  };
}
