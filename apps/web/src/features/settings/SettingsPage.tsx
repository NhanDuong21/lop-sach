import { PasswordPanel } from './PasswordPanel.js';
import { BackupPanel } from './BackupPanel.js';

export function SettingsPage(): React.JSX.Element {
  return (
    <div className="page-stack">
      <header className="page-heading">
        <p className="eyebrow">Lớp Sạch</p>
        <h1>Cài đặt</h1>
        <p>Quản lý dữ liệu và bảo mật của ứng dụng.</p>
      </header>
      <BackupPanel />
      <PasswordPanel />
    </div>
  );
}
