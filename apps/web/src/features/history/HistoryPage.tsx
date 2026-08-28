import type { HistoryMetric } from '@lop-sach/contracts';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, History } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LoadingState } from '../../components/ui/LoadingState.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import { formatPoints, formatWeekRange } from '../../lib/date-labels.js';
import { getClassroom } from '../classroom/classroom.api.js';
import { getHistoryMetrics, getHistorySummary } from './history.api.js';

type SortMode = 'NAME' | 'LOW_LOAD' | 'HIGH_LOAD';

function sortMetrics(metrics: readonly HistoryMetric[], mode: SortMode): HistoryMetric[] {
  return [...metrics].sort((left, right) => {
    const byName = left.studentDisplayName.localeCompare(right.studentDisplayName, 'vi');
    if (mode === 'LOW_LOAD') return left.actualPoints - right.actualPoints || byName;
    if (mode === 'HIGH_LOAD') return right.actualPoints - left.actualPoints || byName;
    return byName;
  });
}

export function HistoryPage(): React.JSX.Element {
  const summary = useQuery({ queryKey: ['history', 'summary'], queryFn: getHistorySummary });
  const metrics = useQuery({ queryKey: ['history', 'metrics'], queryFn: getHistoryMetrics });
  const classroom = useQuery({ queryKey: ['classroom'], queryFn: getClassroom });
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('NAME');
  if (summary.isPending || metrics.isPending || classroom.isPending)
    return <LoadingState label="Đang tải lịch sử trực nhật" />;
  const loadFailed = summary.isError || metrics.isError || classroom.isError || !classroom.data;
  if (loadFailed)
    return (
      <div className="page-stack">
        <header className="page-heading">
          <p className="eyebrow">Theo dõi</p>
          <h1>Lịch sử trực nhật</h1>
        </header>
        <section className="card empty-state">
          <AlertCircle size={30} aria-hidden="true" />
          <h2>Không tải được lịch sử</h2>
          <p>Hãy kiểm tra kết nối và thử lại.</p>
        </section>
      </div>
    );
  if (summary.data?.length === 0)
    return (
      <div className="page-stack">
        <header className="page-heading">
          <p className="eyebrow">Theo dõi</p>
          <h1>Lịch sử trực nhật</h1>
          <p>Các tuần hoàn tất được lưu cố định, không đổi khi sửa dữ liệu lớp.</p>
        </header>
        <section className="card empty-state">
          <History size={30} aria-hidden="true" />
          <h2>Chưa có tuần đã hoàn tất</h2>
          <p>Sau khi một tuần được hoàn tất, kết quả thực tế sẽ xuất hiện tại đây.</p>
        </section>
      </div>
    );

  const groupOptions = [...classroom.data.groups]
    .sort((left, right) => left.order - right.order)
    .map((group) => ({ id: group.id, name: group.name }));
  for (const week of summary.data ?? []) {
    if (!groupOptions.some((group) => group.id === week.groupId))
      groupOptions.push({ id: week.groupId, name: week.groupName });
  }
  const effectiveGroupId = groupOptions.some((group) => group.id === selectedGroupId)
    ? selectedGroupId
    : (groupOptions[0]?.id ?? '');
  const selectedGroup = groupOptions.find((group) => group.id === effectiveGroupId);
  const selectedWeeks = (summary.data ?? []).filter((week) => week.groupId === effectiveGroupId);
  const selectedMetrics = sortMetrics(
    (metrics.data ?? []).filter((metric) => metric.groupId === effectiveGroupId),
    sortMode,
  );

  return (
    <div className="page-stack">
      <header className="page-heading">
        <p className="eyebrow">Theo dõi</p>
        <h1>Lịch sử trực nhật</h1>
        <p>So sánh khối lượng trong cùng một tổ; không dùng để xếp hạng toàn lớp.</p>
      </header>

      <div className="history-group-tabs" role="tablist" aria-label="Chọn tổ để xem lịch sử">
        {groupOptions.map((group) => (
          <button
            type="button"
            role="tab"
            aria-selected={group.id === effectiveGroupId}
            onClick={() => setSelectedGroupId(group.id)}
            key={group.id}
          >
            {group.name}
          </button>
        ))}
      </div>

      <section className="card history-metrics-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{selectedGroup?.name ?? 'Tổ trực'}</p>
            <h2>{selectedWeeks.length} tuần đã hoàn thành</h2>
          </div>
          <label className="history-sort">
            <span>Sắp xếp</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              <option value="NAME">Theo tên</option>
              <option value="LOW_LOAD">Khối lượng thấp trước</option>
              <option value="HIGH_LOAD">Khối lượng cao trước</option>
            </select>
          </label>
        </div>
        <h3>Khối lượng giữa các thành viên</h3>
        <p className="muted">Điểm chỉ dùng để chia công việc cân bằng.</p>
        {selectedMetrics.length === 0 ? (
          <p className="muted">Tổ này chưa có dữ liệu khối lượng đã hoàn thành.</p>
        ) : (
          <div
            className="metrics-table"
            role="table"
            aria-label={`Khối lượng ${selectedGroup?.name ?? ''}`}
          >
            {selectedMetrics.map((metric) => (
              <div className="metric-row" role="row" key={metric.studentId}>
                <strong role="cell">{metric.studentDisplayName}</strong>
                <span role="cell">{metric.dutyCount} công việc</span>
                <span role="cell">{formatPoints(metric.actualPoints)} điểm</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="group-weeks-title">
        <div className="section-heading history-weeks-heading">
          <div>
            <p className="eyebrow">Lịch đã lưu</p>
            <h2 id="group-weeks-title">Các tuần của {selectedGroup?.name ?? 'tổ trực'}</h2>
          </div>
        </div>
        {selectedWeeks.length === 0 ? (
          <div className="card empty-state">
            <History size={28} aria-hidden="true" />
            <h3>Chưa có tuần đã hoàn thành</h3>
          </div>
        ) : (
          <div className="history-list">
            {selectedWeeks.map((week) => (
              <Link className="history-card card" to={`/history/${week.id}`} key={week.id}>
                <div>
                  <span className="muted">Tuần trực</span>
                  <h2>{formatWeekRange(week.weekStart, week.weekEnd)}</h2>
                  <span>
                    {formatPoints(week.actualPoints)} điểm
                    {week.publicationRevision > 1
                      ? ` · Lần cập nhật ${week.publicationRevision}`
                      : ''}
                  </span>
                </div>
                <div className="history-card-status">
                  <StatusBadge tone="success">{week.fairness?.label ?? 'Đã hoàn tất'}</StatusBadge>
                  {week.warningCount > 0 ? (
                    <span>{week.warningCount} lưu ý khi phân công</span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
