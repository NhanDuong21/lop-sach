import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

export function browserIsOnline(): boolean {
  return navigator.onLine;
}

export function useOnlineState(): boolean {
  return useSyncExternalStore(subscribe, browserIsOnline, () => true);
}
