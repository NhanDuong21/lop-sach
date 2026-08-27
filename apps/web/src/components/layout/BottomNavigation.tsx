import { CalendarDays, History, School, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const items = [
  { to: '/', label: 'Tuần này', Icon: CalendarDays, end: true },
  { to: '/class', label: 'Lớp', Icon: School, end: false },
  { to: '/history', label: 'Lịch sử', Icon: History, end: false },
  { to: '/settings', label: 'Cài đặt', Icon: Settings, end: false },
] as const;

export function BottomNavigation(): React.JSX.Element {
  return <nav className="bottom-navigation" aria-label="Điều hướng chính">{items.map(({ to, label, Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={20} aria-hidden="true" /><span>{label}</span></NavLink>)}</nav>;
}
