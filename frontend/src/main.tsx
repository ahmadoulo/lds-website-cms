import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { installAnalyticsQueue } from './lib/analytics';
import { captureSiteOrigin } from './lib/siteOrigin';

// Before anything can want to record an event, and before React renders.
installAnalyticsQueue();
// Before the Seo component rewrites the canonical link it is read from.
captureSiteOrigin();

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
