import { NavLink } from 'react-router-dom';

const items = [
  { to: '/class', label: 'Thông tin chung', end: true },
  { to: '/class/students', label: 'Học sinh', end: true },
  { to: '/class/tasks', label: 'Công việc', end: true },
] as const;

export function ClassroomTabs(): React.JSX.Element {
  return (
    <nav className="section-tabs" aria-label="Các phần của lớp học">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
