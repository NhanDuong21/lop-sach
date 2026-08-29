import { useSyncExternalStore } from 'react';
import {
  getPwaInstallSnapshot,
  requestPwaInstall,
  subscribePwaInstall,
  type PwaInstallSnapshot,
  type PwaPromptOutcome,
} from './pwa-install-controller.js';

export interface PwaInstallControls extends PwaInstallSnapshot {
  promptInstall(): Promise<PwaPromptOutcome>;
}

export function usePwaInstall(): PwaInstallControls {
  const state = useSyncExternalStore(
    subscribePwaInstall,
    getPwaInstallSnapshot,
    getPwaInstallSnapshot,
  );
  return { ...state, promptInstall: requestPwaInstall };
}
