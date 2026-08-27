import { mondayOfWeek, parseDateOnly } from '@lop-sach/contracts';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoadingState } from '../../components/ui/LoadingState.js';
import { Notice } from '../../components/ui/Notice.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import { listDutyWeeks } from '../duty-weeks/duty-weeks.api.js';
import { WeekSummary } from './WeekSummary.js';

function currentMonday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return mondayOfWeek(parseDateOnly(`${map.year ?? ''}-${map.month ?? ''}-${map.day ?? ''}`));
}

export function CurrentWeekPage({
  classroomName,
}: {
  readonly classroomName: string;
}): React.JSX.Element {
  const weekStart = currentMonday();
  const weeks = useQuery({
    queryKey: ['duty-weeks', 'current', weekStart],
    queryFn: () => listDutyWeeks({ from: weekStart, to: weekStart }),
  });
  if (weeks.isPending) return <LoadingState label="Đang tải lịch tuần này" />;
  if (weeks.isError) return <Notice tone="error">Không tải được lịch tuần này.</Notice>;
  const week = weeks.data?.[0];
  return (
    <div className="page-stack">
      <header className="page-heading">
        <p className="eyebrow">{classroomName}</p>
        <h1>Tuần này</h1>
        <p>Lịch tuần {weekStart}; dữ liệu phát hành sẽ được chuẩn bị cho chế độ đọc ngoại tuyến.</p>
      </header>
      {!week ? (
        <section className="card empty-state">
          <CalendarDays size={32} aria-hidden="true" />
          <h2>Chưa có lịch tuần này</h2>
          <p>Tạo tuần, đánh dấu vắng mặt rồi để hệ thống đề xuất phân công.</p>
          <Link className="button button-primary" to="/weeks/new">
            <Plus size={17} aria-hidden="true" />
            Tạo tuần mới
          </Link>
        </section>
      ) : (
        <section className="card">
          <div className="section-heading">
            <div>
              <h2>{week.groupSnapshot.name}</h2>
              <p>
                {week.status === 'DRAFT'
                  ? 'Lịch đang được chuẩn bị.'
                  : `Bản phát hành ${week.publicationRevision}`}
              </p>
            </div>
            <StatusBadge tone={week.status === 'DRAFT' ? 'warning' : 'success'}>
              {week.status === 'DRAFT'
                ? 'Bản nháp'
                : week.status === 'PUBLISHED'
                  ? 'Đã phát hành'
                  : 'Đã hoàn thành'}
            </StatusBadge>
          </div>
          {week.status === 'DRAFT' ? (
            <Notice tone="warning">Lịch chưa phát hành nên chưa phải lịch chính thức.</Notice>
          ) : (
            <WeekSummary week={week} />
          )}
          <Link className="button button-secondary" to={`/weeks/${week.id}`}>
            {week.status === 'DRAFT' ? 'Tiếp tục phân công' : 'Xem chi tiết tuần'}
          </Link>
        </section>
      )}
      <div className="button-row">
        <Link className="button button-secondary" to="/weeks/new">
          Tạo tuần khác
        </Link>
      </div>
    </div>
  );
}
