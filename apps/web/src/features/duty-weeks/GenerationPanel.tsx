import type { DutyWeek } from '@lop-sach/contracts';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { Notice } from '../../components/ui/Notice.js';
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
          <h2>Mức độ cân bằng</h2>
          <p>Chỉ báo giúp nhận ra các trường hợp cần xem lại.</p>
        </div>
        {week.fairness ? (
          <div className="balance-summary">
            <strong>{week.fairness.label}</strong>
            <span>Khối lượng giữa các bạn được so sánh để chia việc đều hơn.</span>
            <details>
              <summary>Xem cách đánh giá</summary>
              <p>
                Chỉ số nội bộ: {week.fairness.score}/100. Đây không phải điểm thi đua và không cần
                cố đạt 100.
              </p>
            </details>
          </div>
        ) : (
          <span className="muted">Chưa có phương án để đánh giá</span>
        )}
      </div>
      {week.status !== 'DRAFT' ? (
        <Notice tone="success">
          <ShieldCheck size={17} aria-hidden="true" /> Lịch đã được công bố và đang ở chế độ chỉ
          xem.
        </Notice>
      ) : week.requiresGeneration ? (
        <Notice tone="warning">
          Cần tạo phương án khác hoặc kiểm tra lại các chỉnh sửa trước khi công bố.
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
            {week.assignments.length > 0 ? 'Tạo phương án khác' : 'Tạo phân công'}
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
