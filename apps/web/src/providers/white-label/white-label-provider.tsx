'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeConfig {
  primaryColor: string;
  logoUrl?: string;
}

interface WhiteLabelContextType {
  theme: ThemeConfig;
  updateTheme: (config: ThemeConfig) => void;
}

const WhiteLabelContext = createContext<WhiteLabelContextType | undefined>(undefined);

export function WhiteLabelProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>({
    primaryColor: '#0f172a',
  });

  useEffect(() => {
    // In a real app, we would fetch this from the Edge/API based on the tenant slug
    const root = document.documentElement;
    root.style.setProperty('--primary', theme.primaryColor);
  }, [theme]);

  const updateTheme = (config: ThemeConfig) => setTheme(config);

  return (
    <WhiteLabelContext.Provider value={{ theme, updateTheme }}>
      {children}
    </WhiteLabelContext.Provider>
  );
}

export function useWhiteLabel() {
  const context = useContext(WhiteLabelContext);
  if (context === undefined) {
    throw new Error('useWhiteLabel must be used within a WhiteLabelProvider');
  }
  return context;
}
