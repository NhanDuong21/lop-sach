import { Copy, QrCode, Share2 } from 'lucide-react';
import QRCode from 'react-qr-code';

export function InstallQrCard({
  installUrl,
  onShare,
}: {
  readonly installUrl: string;
  readonly onShare: () => void;
}): React.JSX.Element {
  return (
    <aside className="install-qr-card" id="ma-qr" aria-labelledby="qr-title">
      <div className="install-qr-brand">
        <img src="/landing/mascot-cleaning.png" alt="Mèo Lớp Sạch đang cầm chổi" />
        <div>
          <strong>Lớp Sạch</strong>
          <span>Đoàn kết · Tích cực · Tiến bộ</span>
        </div>
      </div>
      <div className="install-qr-code" data-install-url={installUrl}>
        <QRCode
          value={installUrl}
          size={112}
          bgColor="#ffffff"
          fgColor="#10271c"
          level="M"
          title="Mã QR cài đặt Lớp Sạch"
        />
      </div>
      <div className="install-qr-copy">
        <QrCode size={22} aria-hidden="true" />
        <div>
          <strong id="qr-title">Quét bằng điện thoại để cài Lớp Sạch</strong>
          <span>{new URL(installUrl).host}</span>
        </div>
        <button type="button" className="install-qr-share" onClick={onShare}>
          <Share2 size={18} aria-hidden="true" />
          <span>Chia sẻ</span>
          <Copy className="install-copy-icon" size={17} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
