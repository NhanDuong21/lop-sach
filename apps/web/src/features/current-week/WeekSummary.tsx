import type { DutyWeek } from '@lop-sach/contracts';
import { Notice } from '../../components/ui/Notice.js';
import { formatDutyDate } from '../../lib/date-labels.js';
import { uniqueWarningCodes, warningCountText, warningLabels } from '../../lib/week-warnings.js';

export function WeekSummary({ week }: { readonly week: DutyWeek }): React.JSX.Element {
  const dates = [
    ...new Set(week.taskOccurrences.filter((item) => item.enabled).map((item) => item.date)),
  ].sort();
  return (
    <div className="week-summary">
      {week.warnings.length > 0 ? (
        <Notice tone="warning">
          Lịch có {warningCountText(week)} đã được xem trước khi phát hành.
          <ul className="warning-summary-list">
            {uniqueWarningCodes(week).map((code) => (
              <li key={code}>{warningLabels[code] ?? 'Có phân công cần xem lại.'}</li>
            ))}
          </ul>
        </Notice>
      ) : null}
      {dates.map((date) => (
        <section className="summary-day" key={date}>
          <h3>{formatDutyDate(date)}</h3>
          {week.taskOccurrences
            .filter((occurrence) => occurrence.enabled && occurrence.date === date)
            .map((occurrence) => (
              <div className="summary-task" key={occurrence.id}>
                <strong>{occurrence.taskName}</strong>
                <span>
                  {occurrence.slots
                    .map(
                      (slot) =>
                        week.assignments.find((assignment) => assignment.slotId === slot.id)
                          ?.actualStudentDisplayName ??
                        week.assignments.find((assignment) => assignment.slotId === slot.id)
                          ?.studentDisplayName ??
                        'Chưa phân công',
                    )
                    .join(', ')}
                </span>
              </div>
            ))}
        </section>
      ))}
    </div>
  );
}
