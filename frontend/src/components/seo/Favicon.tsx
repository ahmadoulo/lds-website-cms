import { useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';

const MANAGED_ATTRIBUTE = 'data-lds-favicon';

function setIcon(rel: string, href: string, type?: string) {
  // Remove the build-time icons and any previously injected one, otherwise the
  // browser keeps showing whichever it saw first.
  document.head
    .querySelectorAll(`link[rel="${rel}"]`)
    .forEach((node) => node.remove());

  const link = document.createElement('link');
  link.setAttribute('rel', rel);
  link.setAttribute('href', href);
  link.setAttribute(MANAGED_ATTRIBUTE, 'true');
  if (type) link.setAttribute('type', type);
  document.head.appendChild(link);
}

/**
 * Swaps the browser-tab icon for the one uploaded in the administration.
 * Without an upload the static icon shipped with the build stays in place.
 */
export const Favicon = () => {
  const { settings } = useSettings();
  const favicon = settings?.branding?.favicon;

  useEffect(() => {
    if (!favicon?.url) return;

    setIcon('icon', favicon.url, favicon.mimeType);
    setIcon('apple-touch-icon', favicon.url);
  }, [favicon?.url, favicon?.mimeType]);

  return null;
};
