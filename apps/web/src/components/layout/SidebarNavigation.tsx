import { CalendarDays, ClipboardList, History, School, Settings, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const items = [
  { to: '/', label: 'Tuần này', Icon: CalendarDays, end: true },
  { to: '/class', label: 'Thông tin lớp', Icon: School, end: true },
  { to: '/class/students', label: 'Học sinh', Icon: Users, end: true },
  { to: '/settings/tasks', label: 'Công việc', Icon: ClipboardList, end: true },
  { to: '/history', label: 'Lịch sử', Icon: History, end: false },
  { to: '/settings', label: 'Cài đặt', Icon: Settings, end: true },
] as const;

export function SidebarNavigation({ classroomName }: { readonly classroomName: string }): React.JSX.Element {
  return <aside className="sidebar"><div className="sidebar-brand"><span className="brand-mark" aria-hidden="true">LS</span><div><strong>Lớp Sạch</strong><small>{classroomName}</small></div></div><nav aria-label="Điều hướng chính">{items.map(({ to, label, Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={19} aria-hidden="true" /><span>{label}</span></NavLink>)}</nav></aside>;
}
