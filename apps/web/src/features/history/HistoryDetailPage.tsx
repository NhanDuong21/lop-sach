import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { LoadingState } from '../../components/ui/LoadingState.js';
import { Notice } from '../../components/ui/Notice.js';
import { WeekSummary } from '../current-week/WeekSummary.js';
import { getClassroom } from '../classroom/classroom.api.js';
import { getDutyWeek } from '../duty-weeks/duty-weeks.api.js';
import { WeekExportActions } from '../duty-weeks/WeekExportActions.js';

export function HistoryDetailPage(): React.JSX.Element {
  const { weekId = '' } = useParams();
  const week = useQuery({ queryKey: ['duty-week', weekId], queryFn: () => getDutyWeek(weekId) });
  const classroom = useQuery({ queryKey: ['classroom'], queryFn: getClassroom });
  if (week.isPending || classroom.isPending) return <LoadingState label="Đang tải lịch sử tuần" />;
  if (!week.data || !classroom.data)
    return <Notice tone="error">Không tải được tuần lịch sử này.</Notice>;
  return (
    <div className="page-stack">
      <header className="page-heading">
        <p className="eyebrow">Tuần đã hoàn tất</p>
        <h1>Tuần {week.data.weekStart}</h1>
        <p>
          {week.data.groupSnapshot.name} · Bản phát hành {week.data.publicationRevision}
        </p>
      </header>
      <WeekExportActions week={week.data} classroomName={classroom.data.name} />
      {week.data.completionLedger.some((entry) => entry.usedAssignedPerformerFallback) ? (
        <Notice tone="warning">
          Một số lượt dùng người được phân công làm dữ liệu thực tế do chưa ghi người thay.
        </Notice>
      ) : null}
      <section className="card">
        <WeekSummary week={week.data} />
      </section>
      <section className="card compact-history">
        <h2>Lịch sử thay đổi</h2>
        <p>
          {week.data.changeLogSummary.totalCompacted} thay đổi cũ đã được rút gọn; còn{' '}
          {week.data.changeLog.length} mục chi tiết gần nhất.
        </p>
      </section>
      <Link className="text-link" to="/history">
        Quay lại lịch sử
      </Link>
    </div>
  );
}
