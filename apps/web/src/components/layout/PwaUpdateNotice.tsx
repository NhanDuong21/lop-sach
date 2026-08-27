import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PWA_UPDATE_EVENT } from '../../lib/pwa.js';

export function PwaUpdateNotice(): React.JSX.Element | null {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  useEffect(() => {
    const update = (event: Event): void => {
      setRegistration((event as CustomEvent<ServiceWorkerRegistration>).detail);
    };
    window.addEventListener(PWA_UPDATE_EVENT, update);
    return () => window.removeEventListener(PWA_UPDATE_EVENT, update);
  }, []);
  if (!registration) return null;
  return (
    <div className="pwa-update-notice" role="status">
      <span>Có bản cập nhật mới. Hãy tải lại trước khi tạo phân công.</span>
      <button
        type="button"
        onClick={() => {
          navigator.serviceWorker.addEventListener(
            'controllerchange',
            () => window.location.reload(),
            {
              once: true,
            },
          );
          registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
        }}
      >
        <RefreshCw size={16} aria-hidden="true" /> Cập nhật
      </button>
    </div>
  );
}
