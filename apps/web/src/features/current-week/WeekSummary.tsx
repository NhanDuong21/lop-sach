import type { DutyWeek } from '@lop-sach/contracts';
import { Notice } from '../../components/ui/Notice.js';

export function WeekSummary({ week }: { readonly week: DutyWeek }): React.JSX.Element {
  const dates = [
    ...new Set(week.taskOccurrences.filter((item) => item.enabled).map((item) => item.date)),
  ].sort();
  return (
    <div className="week-summary">
      {week.warnings.length > 0 ? (
        <Notice tone="warning">
          Lịch có {week.warnings.length} cảnh báo đã được người vận hành xem trước khi phát hành.
        </Notice>
      ) : null}
      {dates.map((date) => (
        <section className="summary-day" key={date}>
          <h3>{date}</h3>
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
                          ?.studentDisplayName ?? 'Chưa phân công',
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
