import type { DutyWeek } from '@lop-sach/contracts';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { Notice } from '../../components/ui/Notice.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import { uniqueWarningCodes, warningLabels } from '../../lib/week-warnings.js';

export function GenerationPanel({
  week,
  pending,
  onGenerate,
  onPreflight,
}: {
  readonly week: DutyWeek;
  readonly pending: boolean;
  readonly onGenerate: () => void;
  readonly onPreflight: () => void;
}): React.JSX.Element {
  const uniqueWarnings = uniqueWarningCodes(week);
  return (
    <section className="card generation-panel">
      <div className="section-heading">
        <div>
          <h2>Chất lượng phân công</h2>
          <p>Kết quả sau khi lưu là kết quả chính thức.</p>
        </div>
        {week.fairness ? (
          <div className="fairness-summary">
            <StatusBadge tone={week.fairness.score >= 65 ? 'success' : 'warning'}>
              {week.fairness.label} · {week.fairness.score}/100
            </StatusBadge>
            <small>Điểm càng cao, khối lượng giữa các bạn càng đều.</small>
          </div>
        ) : (
          <StatusBadge tone="warning">Chưa kiểm tra</StatusBadge>
        )}
      </div>
      {week.requiresGeneration ? (
        <Notice tone="warning">
          Cần tạo lại phân công hoặc kiểm tra lại các chỉnh sửa trước khi phát hành.
        </Notice>
      ) : (
        <Notice tone="success">
          <ShieldCheck size={17} aria-hidden="true" /> Phân công đã đủ điều kiện để công bố.
        </Notice>
      )}
      {uniqueWarnings.map((code) => (
        <Notice tone="warning" key={code}>
          {warningLabels[code] ?? 'Phân công có cảnh báo cần xem lại.'}
        </Notice>
      ))}
      {week.status === 'DRAFT' ? (
        <div className="button-row">
          <Button onClick={onGenerate} disabled={pending}>
            <RefreshCw size={17} aria-hidden="true" />
            {week.assignments.length > 0 ? 'Tạo lại phân công' : 'Tạo phân công'}
          </Button>
          {week.assignments.length > 0 && week.requiresGeneration ? (
            <Button variant="secondary" onClick={onPreflight} disabled={pending}>
              Kiểm tra lại phân công
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
