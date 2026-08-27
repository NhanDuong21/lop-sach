import { CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CurrentWeekPage({ classroomName }: { readonly classroomName: string }): React.JSX.Element {
  return <div className="page-stack"><header className="page-heading"><p className="eyebrow">{classroomName}</p><h1>Tuần này</h1><p>Lịch đã publish sẽ xuất hiện tại đây và được giữ để đọc khi ngoại tuyến.</p></header><section className="card empty-state"><CalendarDays size={32} aria-hidden="true" /><h2>Chưa có lịch tuần này</h2><p>Kiểm tra danh sách học sinh và công việc trước khi tạo tuần trực đầu tiên.</p><div className="button-row"><Link className="button button-secondary" to="/class/students">Kiểm tra học sinh</Link><Link className="button button-primary" to="/settings/tasks">Kiểm tra công việc</Link></div></section></div>;
}
