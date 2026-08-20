import React, { createContext, useContext, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

interface PreviewContextType {
  /** True when the visitor asked to see unpublished content. */
  isPreview: boolean;
  /** Appends the flag to a public API call when previewing. */
  params: Record<string, string> | undefined;
}

const PreviewContext = createContext<PreviewContextType>({ isPreview: false, params: undefined });

/**
 * The flag is only a request: the API serves drafts to a signed-in editor and
 * the published site to everyone else, so it can travel in a plain URL.
 */
export const PreviewProvider = ({ children }: { children: React.ReactNode }) => {
  const [searchParams] = useSearchParams();
  const raw = searchParams.get('preview');
  const isPreview = raw === '1' || raw === 'true';

  const value = useMemo(
    () => ({ isPreview, params: isPreview ? { preview: 'true' } : undefined }),
    [isPreview],
  );

  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>;
};

export const usePreview = () => useContext(PreviewContext);
