import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { LoadingState } from '../../components/ui/LoadingState.js';
import { Notice } from '../../components/ui/Notice.js';
import { WeekSummary } from '../current-week/WeekSummary.js';
import { getClassroom } from '../classroom/classroom.api.js';
import { getDutyWeek } from '../duty-weeks/duty-weeks.api.js';
import { WeekExportActions } from '../duty-weeks/WeekExportActions.js';
import { formatWeekRange } from '../../lib/date-labels.js';

export function HistoryDetailPage(): React.JSX.Element {
  const { weekId = '' } = useParams();
  const week = useQuery({ queryKey: ['duty-week', weekId], queryFn: () => getDutyWeek(weekId) });
  const classroom = useQuery({ queryKey: ['classroom'], queryFn: getClassroom });
  if (week.isPending || classroom.isPending) return <LoadingState label="Đang tải lịch sử tuần" />;
  if (!week.data || !classroom.data)
    return <Notice tone="error">Không tải được tuần lịch sử này.</Notice>;
  const weekEnd = week.data.taskOccurrences
    .filter((occurrence) => occurrence.enabled)
    .map((occurrence) => occurrence.date)
    .sort()
    .at(-1);
  return (
    <div className="page-stack">
      <header className="page-heading">
        <p className="eyebrow">Tuần đã hoàn tất</p>
        <h1>Tuần {formatWeekRange(week.data.weekStart, weekEnd)}</h1>
        <p>
          {week.data.groupSnapshot.name}
          {week.data.publicationRevision > 1
            ? ` · Lần cập nhật ${week.data.publicationRevision}`
            : ''}
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
          Ứng dụng đã lưu {week.data.changeLogSummary.totalCompacted} thay đổi trước đó và{' '}
          {week.data.changeLog.length} thay đổi gần nhất.
        </p>
      </section>
      <Link className="text-link" to="/history">
        Quay lại lịch sử
      </Link>
    </div>
  );
}
