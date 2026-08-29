import { ExternalLink, MoreVertical, Share2, Smartphone } from 'lucide-react';
import { ModalDialog } from '../../components/ui/ModalDialog.js';
import type { InstallPlatform } from './platform-detection.js';

function IosGuide(): React.JSX.Element {
  return (
    <ol className="install-dialog-steps">
      <li>Mở liên kết bằng Safari.</li>
      <li>
        Nhấn nút <Share2 size={17} aria-label="Chia sẻ" /> Chia sẻ.
      </li>
      <li>
        Chọn “Thêm vào Màn hình chính”, bật “Mở dưới dạng ứng dụng web” nếu được hiển thị, rồi nhấn
        “Thêm”.
      </li>
    </ol>
  );
}

function BrowserGuide({ inApp }: { readonly inApp: boolean }): React.JSX.Element {
  return (
    <>
      {inApp ? (
        <p className="install-dialog-notice">
          Trình duyệt đang mở trong một ứng dụng khác. Hãy dùng tùy chọn mở liên kết bằng Chrome
          hoặc Safari trước khi cài.
        </p>
      ) : null}
      <ol className="install-dialog-steps">
        <li>
          Mở menu trình duyệt <MoreVertical size={17} aria-label="Ba chấm" />.
        </li>
        <li>Chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”.</li>
        <li>Xác nhận “Cài đặt” khi trình duyệt hỏi.</li>
      </ol>
    </>
  );
}

export function InstallGuideDialog({
  open,
  platform,
  onClose,
}: {
  readonly open: boolean;
  readonly platform: InstallPlatform;
  readonly onClose: () => void;
}): React.JSX.Element | null {
  const ios = platform === 'IOS';
  return (
    <ModalDialog
      open={open}
      size="small"
      className="install-guide-modal"
      title={ios ? 'Cài trên iPhone hoặc iPad' : 'Cài Lớp Sạch từ trình duyệt'}
      description="Các bước chỉ mất khoảng một phút."
      onClose={onClose}
    >
      <div className="install-dialog-icon" aria-hidden="true">
        {ios ? <Share2 size={24} /> : <Smartphone size={24} />}
      </div>
      {ios ? <IosGuide /> : <BrowserGuide inApp={platform === 'IN_APP_BROWSER'} />}
      <p className="install-dialog-tip">
        <ExternalLink size={17} aria-hidden="true" /> Sau khi thêm, hãy mở Lớp Sạch từ màn hình
        chính để có trải nghiệm tốt nhất.
      </p>
      <div className="modal-actions button-row">
        <button type="button" className="button button-primary" onClick={onClose}>
          Đã hiểu
        </button>
      </div>
    </ModalDialog>
  );
}
