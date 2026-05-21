'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface AnalyticsContextType {
  trackEvent: (name: string, properties?: Record<string, any>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Track page view
    console.log(`[Analytics] Page viewed: ${pathname}`);
  }, [pathname]);

  const trackEvent = (name: string, properties?: Record<string, any>) => {
    // Implementation for Plausible/GTM/Mixpanel
    console.log(`[Analytics] Event: ${name}`, properties);
  };

  return (
    <AnalyticsContext.Provider value={{ trackEvent }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}
