import React from 'react';
import { Eye } from 'lucide-react';
import { Button } from '../../ui/Button';

/**
 * Opens the public page in a preview tab. The API decides what the tab actually
 * shows: drafts for a signed-in editor, the published site for anyone else.
 *
 * The tab is named so repeated clicks reuse it instead of piling up windows.
 */
export function openPreview(path: string) {
  const separator = path.includes('?') ? '&' : '?';
  window.open(`${path}${separator}preview=1`, 'lds-preview');
}

interface PreviewButtonProps {
  /** Public path this section renders on, e.g. `/actualites`. */
  path: string;
  label?: string;
  variant?: 'outline' | 'ghost';
  size?: 'sm' | 'md';
}

export const PreviewButton = ({
  path,
  label = 'Prévisualiser',
  variant = 'outline',
  size = 'md',
}: PreviewButtonProps) => (
  <Button type="button" variant={variant} size={size} onClick={() => openPreview(path)}>
    <Eye className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} /> {label}
  </Button>
);
