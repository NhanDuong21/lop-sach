import { useQuery } from '@tanstack/react-query';
import { AlertCircle, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoadingState } from '../../components/ui/LoadingState.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import { formatPoints, formatWeekRange } from '../../lib/date-labels.js';
import { getHistoryMetrics, getHistorySummary } from './history.api.js';

export function HistoryPage(): React.JSX.Element {
  const summary = useQuery({ queryKey: ['history', 'summary'], queryFn: getHistorySummary });
  const metrics = useQuery({ queryKey: ['history', 'metrics'], queryFn: getHistoryMetrics });
  if (summary.isPending || metrics.isPending)
    return <LoadingState label="Đang tải lịch sử trực nhật" />;
  return (
    <div className="page-stack">
      <header className="page-heading">
        <p className="eyebrow">Theo dõi</p>
        <h1>Lịch sử trực nhật</h1>
        <p>Các tuần hoàn tất được lưu cố định, không đổi khi sửa dữ liệu lớp.</p>
      </header>
      {summary.isError || metrics.isError ? (
        <section className="card empty-state">
          <AlertCircle size={30} aria-hidden="true" />
          <h2>Không tải được lịch sử</h2>
          <p>Hãy kiểm tra kết nối và thử lại.</p>
        </section>
      ) : summary.data?.length === 0 ? (
        <section className="card empty-state">
          <History size={30} aria-hidden="true" />
          <h2>Chưa có tuần đã hoàn tất</h2>
          <p>Sau khi một tuần được hoàn tất, kết quả thực tế sẽ xuất hiện tại đây.</p>
        </section>
      ) : (
        <>
          <section className="card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Tổng hợp người thực hiện thực tế</p>
                <h2>Khối lượng đã hoàn thành</h2>
              </div>
            </div>
            <p className="muted">
              Điểm chỉ dùng để chia công việc cân bằng, không phải điểm thi đua hay xếp hạng.
            </p>
            <div className="metrics-table" role="table" aria-label="Thống kê lịch sử">
              {metrics.data?.map((metric) => (
                <div className="metric-row" role="row" key={metric.studentId}>
                  <strong role="cell">{metric.studentDisplayName}</strong>
                  <span role="cell">{metric.dutyCount} công việc</span>
                  <span role="cell">{formatPoints(metric.actualPoints)} điểm</span>
                </div>
              ))}
            </div>
          </section>
          <section className="history-list" aria-label="Các tuần đã hoàn tất">
            {summary.data?.map((week) => (
              <Link className="history-card card" to={`/history/${week.id}`} key={week.id}>
                <div>
                  <span className="muted">
                    Tuần {formatWeekRange(week.weekStart, week.weekEnd)}
                  </span>
                  <h2>{week.groupName}</h2>
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
          </section>
        </>
      )}
    </div>
  );
}
