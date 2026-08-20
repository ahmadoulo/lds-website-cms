import React, { createContext, useContext } from 'react';
import { useSiteSettings } from '../lib/queries/publicHooks';
import type { SiteSettings } from '../lib/types';

interface SettingsContextType {
  settings: SiteSettings | undefined;
  isLoading: boolean;
  error: unknown;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const { data, isLoading, error } = useSiteSettings();

  return (
    <SettingsContext.Provider value={{ settings: data, isLoading, error }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
