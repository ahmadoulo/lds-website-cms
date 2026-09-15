import { useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';

const MANAGED_ATTRIBUTE = 'data-lds-favicon';

/** What index.html ships with: the association's mark, cropped square. */
const STATIC_ICON = '/logo-mark.png';

/**
 * iOS home-screen icons. Safari ignores SVG and .ico here, so pointing
 * apple-touch-icon at either leaves the visitor with a screenshot of the page
 * instead of the association's mark.
 */
const APPLE_TOUCH_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function clearManaged(rel: string) {
  document.head
    .querySelectorAll(`link[rel="${rel}"][${MANAGED_ATTRIBUTE}]`)
    .forEach((node) => node.remove());
}

function setIcon(rel: string, href: string, type?: string, sizes?: string) {
  // Any icon already in the head wins over one appended later, so the build-time
  // link has to go before the uploaded one is added.
  document.head.querySelectorAll(`link[rel="${rel}"]`).forEach((node) => node.remove());

  const link = document.createElement('link');
  link.setAttribute('rel', rel);
  link.setAttribute('href', href);
  link.setAttribute(MANAGED_ATTRIBUTE, 'true');
  if (type) link.setAttribute('type', type);
  if (sizes) link.setAttribute('sizes', sizes);
  document.head.appendChild(link);
}

/**
 * Swaps the browser-tab icon for the one uploaded in the administration.
 *
 * Without an upload, the static icon shipped with the build stays in place -
 * and if the administrator later removes the favicon, the static one is put
 * back rather than leaving the tab pointing at a media file that no longer
 * exists.
 */
export const Favicon = () => {
  const { settings } = useSettings();
  const favicon = settings?.branding?.favicon;

  const url = favicon?.url;
  const mimeType = favicon?.mimeType;
  const width = favicon?.width;
  const height = favicon?.height;

  useEffect(() => {
    // The managed apple-touch-icon is cleared on every run, not only when a new
    // one replaces it: otherwise a favicon swapped for an .ico would leave the
    // previous PNG behind as the home-screen icon.
    clearManaged('apple-touch-icon');

    if (!url) {
      // Nothing uploaded: restore what index.html shipped with.
      clearManaged('icon');
      if (!document.head.querySelector('link[rel="icon"]')) {
        setIcon('icon', STATIC_ICON, 'image/png', '512x512');
      }
      return;
    }

    // A square source can declare its size; a .ico carries several and should
    // declare none, which is what `sizes="any"` means.
    const sizes = width && height && width === height ? `${width}x${height}` : undefined;
    setIcon('icon', url, mimeType, sizes);

    if (mimeType && APPLE_TOUCH_TYPES.includes(mimeType)) {
      setIcon('apple-touch-icon', url, undefined, '180x180');
    }
  }, [url, mimeType, width, height]);

  return null;
};
