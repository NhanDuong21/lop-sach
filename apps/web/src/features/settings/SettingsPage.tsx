import { ClipboardList, School, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
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
      <section className="settings-grid">
        <Link className="settings-link" to="/class">
          <School aria-hidden="true" />
          <div>
            <strong>Thông tin lớp</strong>
            <span>Tên, năm học, ngày học và các tổ</span>
          </div>
        </Link>
        <Link className="settings-link" to="/class/students">
          <Users aria-hidden="true" />
          <div>
            <strong>Học sinh</strong>
            <span>Tổ, trạng thái và hạn chế phân công</span>
          </div>
        </Link>
        <Link className="settings-link" to="/settings/tasks">
          <ClipboardList aria-hidden="true" />
          <div>
            <strong>Công việc</strong>
            <span>Số người, mức việc và điều kiện</span>
          </div>
        </Link>
      </section>
      <BackupPanel />
      <PasswordPanel />
    </div>
  );
}
