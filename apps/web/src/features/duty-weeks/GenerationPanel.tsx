import type { DutyWeek } from '@lop-sach/contracts';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { Notice } from '../../components/ui/Notice.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';

const warningLabels: Readonly<Record<string, string>> = {
  UNASSIGNED_SLOT: 'Còn vị trí chưa phân công.',
  SAME_DAY_ASSIGNMENT_RELAXED:
    'Một học sinh được giao nhiều công việc trong cùng ngày vì không có phương án phù hợp hơn.',
  RECENT_TASK_REPEAT_RELAXED: 'Có học sinh lặp lại công việc gần đây.',
  CONSECUTIVE_DATES_RELAXED: 'Có học sinh trực ở các ngày liên tiếp.',
  WORKLOAD_BALANCE_RELAXED: 'Đã nới mức cân bằng khối lượng để đủ người.',
};

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
  const uniqueWarnings = [...new Set(week.warnings.map((warning) => warning.code))];
  return (
    <section className="card generation-panel">
      <div className="section-heading">
        <div>
          <h2>Chất lượng phân công</h2>
          <p>Kết quả lưu trên máy chủ là kết quả chính thức.</p>
        </div>
        {week.fairness ? (
          <StatusBadge tone={week.fairness.score >= 65 ? 'success' : 'warning'}>
            {week.fairness.label} · {week.fairness.score}
          </StatusBadge>
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
          <ShieldCheck size={17} aria-hidden="true" /> Ngữ cảnh phân công hiện hợp lệ.
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
