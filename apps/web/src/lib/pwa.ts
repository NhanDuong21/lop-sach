export const PWA_UPDATE_EVENT = 'lop-sach:pwa-update';

export async function registerPwa(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
  const announceWaiting = (): void => {
    if (registration.waiting)
      window.dispatchEvent(new CustomEvent(PWA_UPDATE_EVENT, { detail: registration }));
  };
  announceWaiting();
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) announceWaiting();
    });
  });
}
