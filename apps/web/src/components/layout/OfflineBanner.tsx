import { useEffect, useState } from 'react';

export function OfflineBanner(): React.JSX.Element | null {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = (): void => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online ? null : (
    <div className="offline-banner" role="status">
      Bạn đang ngoại tuyến. Dữ liệu chỉ có thể xem, không thể thay đổi.
    </div>
  );
}
