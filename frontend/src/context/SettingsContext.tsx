import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api/axios';

interface SettingsContextType {
  settings: Record<string, any>;
  isLoading: boolean;
  error: any;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['public', 'settings'],
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return (
    <SettingsContext.Provider value={{ settings: settings || {}, isLoading, error }}>
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
