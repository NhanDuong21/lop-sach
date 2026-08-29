import { browserNavigator, isStandaloneDisplay } from './platform-detection.js';

export interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{
    readonly outcome: 'accepted' | 'dismissed';
    readonly platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PwaInstallSnapshot {
  readonly canPrompt: boolean;
  readonly installedInSession: boolean;
  readonly standalone: boolean;
}

export type PwaPromptOutcome = 'accepted' | 'dismissed' | 'unavailable';

let initialized = false;
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let snapshot: PwaInstallSnapshot = {
  canPrompt: false,
  installedInSession: false,
  standalone: false,
};
const subscribers = new Set<() => void>();

function updateSnapshot(next: Partial<PwaInstallSnapshot>): void {
  const updated = { ...snapshot, ...next };
  if (
    updated.canPrompt === snapshot.canPrompt &&
    updated.installedInSession === snapshot.installedInSession &&
    updated.standalone === snapshot.standalone
  )
    return;
  snapshot = updated;
  subscribers.forEach((subscriber) => subscriber());
}

function readStandalone(mediaQuery: MediaQueryList): boolean {
  return isStandaloneDisplay(mediaQuery.matches, browserNavigator());
}

export function initializePwaInstallCapture(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  const standaloneQuery = window.matchMedia('(display-mode: standalone)');
  updateSnapshot({ standalone: readStandalone(standaloneQuery) });

  window.addEventListener('beforeinstallprompt', (event) => {
    const installEvent = event as BeforeInstallPromptEvent;
    installEvent.preventDefault();
    deferredPrompt = installEvent;
    updateSnapshot({ canPrompt: true });
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    updateSnapshot({ canPrompt: false, installedInSession: true });
  });
  standaloneQuery.addEventListener('change', () => {
    updateSnapshot({ standalone: readStandalone(standaloneQuery) });
  });
}

export function subscribePwaInstall(subscriber: () => void): () => void {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

export function getPwaInstallSnapshot(): PwaInstallSnapshot {
  return snapshot;
}

export async function requestPwaInstall(): Promise<PwaPromptOutcome> {
  const prompt = deferredPrompt;
  if (!prompt) return 'unavailable';
  deferredPrompt = null;
  updateSnapshot({ canPrompt: false });
  await prompt.prompt();
  const choice = await prompt.userChoice;
  if (choice.outcome === 'accepted') updateSnapshot({ installedInSession: true });
  return choice.outcome;
}
