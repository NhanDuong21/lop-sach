import { CalendarDays, History, LogOut, School, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const items = [
  { to: '/', label: 'Tuần này', Icon: CalendarDays, end: true },
  { to: '/class', label: 'Lớp học', Icon: School, end: false },
  { to: '/history', label: 'Lịch sử', Icon: History, end: false },
  { to: '/settings', label: 'Cài đặt', Icon: Settings, end: true },
] as const;

export function SidebarNavigation({
  classroomName,
  displayName,
  onLogout,
}: {
  readonly classroomName: string;
  readonly displayName: string;
  readonly onLogout: () => void;
}): React.JSX.Element {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img className="brand-logo" src="/icons/logo-nobackground.png" alt="" aria-hidden="true" />
        <div>
          <strong>Lớp Sạch</strong>
          <small>{classroomName}</small>
        </div>
      </div>
      <nav aria-label="Điều hướng chính">
        {items.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <Icon size={19} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-account">
        <div>
          <small>Tài khoản</small>
          <strong>{displayName}</strong>
        </div>
        <button type="button" aria-label="Đăng xuất" onClick={onLogout}>
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
