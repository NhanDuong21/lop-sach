import { Eye, LockKeyhole, LogIn, UserRound } from 'lucide-react';

export function InstallPhonePreview(): React.JSX.Element {
  return (
    <div className="install-phone-stage" aria-hidden="true">
      <div className="install-phone">
        <div className="install-phone-island" />
        <div className="install-phone-screen">
          <span className="install-phone-time">9:41</span>
          <div className="install-phone-brand">
            <img src="/landing/logo-lop-sach.png" alt="" />
            <strong>Lớp Sạch</strong>
          </div>
          <div className="install-phone-greeting">
            <strong>Xin chào!</strong>
            <span>Đăng nhập để tiếp tục</span>
          </div>
          <div className="install-phone-field">
            <UserRound size={16} />
            <span>Nhập tên đăng nhập</span>
          </div>
          <div className="install-phone-field">
            <LockKeyhole size={16} />
            <span>Nhập mật khẩu</span>
            <Eye size={16} />
          </div>
          <div className="install-phone-button">
            <LogIn size={17} />
            Đăng nhập
          </div>
          <p>Đoàn kết · Tích cực · Tiến bộ</p>
          <span className="install-phone-mascot" />
        </div>
      </div>
    </div>
  );
}
