import { useOnlineState } from '../../lib/online-state.js';

export function OfflineBanner(): React.JSX.Element | null {
  const online = useOnlineState();
  return online ? null : (
    <div className="offline-banner" role="status">
      Bạn đang ngoại tuyến. Dữ liệu chỉ có thể xem, không thể thay đổi.
    </div>
  );
}
