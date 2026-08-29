import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.js';
import { Providers } from './app/providers.js';
import './styles.css';
import { registerPwa } from './lib/pwa.js';
import { initializePwaInstallCapture } from './features/pwa-install/pwa-install-controller.js';

const root = document.querySelector<HTMLDivElement>('#root');
if (!root) throw new Error('Không tìm thấy application root.');
initializePwaInstallCapture();
createRoot(root).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
);

if (import.meta.env.PROD) void registerPwa().catch(() => undefined);
