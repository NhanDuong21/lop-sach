import type { DutyWeek } from '@lop-sach/contracts';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { Notice } from '../../components/ui/Notice.js';
import { formatDutyDate } from '../../lib/date-labels.js';
import { uniqueWarningCodes, warningCountText, warningLabels } from '../../lib/week-warnings.js';

function DaySummary({
  date,
  week,
}: {
  readonly date: string;
  readonly week: DutyWeek;
}): React.JSX.Element {
  const occurrences = week.taskOccurrences.filter(
    (occurrence) => occurrence.enabled && occurrence.date === date,
  );
  return (
    <div className="summary-task-list">
      {occurrences.map((occurrence) => {
        const performers = occurrence.slots.map((slot) => {
          const assignment = week.assignments.find((item) => item.slotId === slot.id);
          const actualName = assignment?.actualStudentDisplayName;
          const assignedName = assignment?.studentDisplayName;
          return {
            slotId: slot.id,
            displayName: actualName ?? assignedName ?? 'Chưa phân công',
            replacedName:
              week.status === 'COMPLETED' &&
              assignment?.actualStudentId !== null &&
              assignment?.actualStudentId !== assignment?.studentId
                ? assignedName
                : null,
          };
        });
        const hasReplacement = performers.some((performer) => performer.replacedName);
        return (
          <div className="summary-task" key={occurrence.id}>
            <strong>{occurrence.taskName}</strong>
            {hasReplacement ? (
              <div className="summary-performers">
                {performers.map((performer) => (
                  <span className="summary-performer" key={performer.slotId}>
                    {performer.displayName}
                    {performer.replacedName ? <small>Thay {performer.replacedName}</small> : null}
                  </span>
                ))}
              </div>
            ) : (
              <span>{performers.map((performer) => performer.displayName).join(', ')}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function daySummaryMeta(date: string, week: DutyWeek): string {
  const occurrences = week.taskOccurrences.filter(
    (occurrence) => occurrence.enabled && occurrence.date === date,
  );
  const students = new Set<string>();
  occurrences.forEach((occurrence) => {
    occurrence.slots.forEach((slot) => {
      const assignment = week.assignments.find((item) => item.slotId === slot.id);
      const studentKey =
        assignment?.actualStudentId ??
        assignment?.studentId ??
        assignment?.actualStudentDisplayName ??
        assignment?.studentDisplayName;
      if (studentKey) students.add(studentKey);
    });
  });
  return `${String(occurrences.length)} nhiệm vụ · ${String(students.size)} bạn`;
}

export function WeekSummary({
  week,
  today,
}: {
  readonly week: DutyWeek;
  readonly today?: string;
}): React.JSX.Element {
  const dates = [
    ...new Set(week.taskOccurrences.filter((item) => item.enabled).map((item) => item.date)),
  ].sort();
  return (
    <div className="week-summary">
      {week.warnings.length > 0 ? (
        <Notice tone="warning">
          Lịch có {warningCountText(week)} đã được xem trước khi công bố.
          <ul className="warning-summary-list">
            {uniqueWarningCodes(week).map((code) => (
              <li key={code}>{warningLabels[code] ?? 'Có phân công cần xem lại.'}</li>
            ))}
          </ul>
        </Notice>
      ) : null}
      <div className="desktop-week-grid">
        {dates.map((date) => (
          <section className={`summary-day${date === today ? ' is-today' : ''}`} key={date}>
            <div className="summary-day-heading">
              <div className="summary-day-title">
                <CalendarDays size={19} aria-hidden="true" />
                <h3>{formatDutyDate(date)}</h3>
              </div>
              {date === today ? <span>Hôm nay</span> : null}
            </div>
            <DaySummary date={date} week={week} />
          </section>
        ))}
      </div>
      <div className="mobile-week-list">
        {dates.map((date, index) => (
          <details
            className="summary-day"
            open={date === today || (!today && index === 0)}
            key={date}
          >
            <summary>
              <CalendarDays className="mobile-summary-calendar" size={22} aria-hidden="true" />
              <span className="mobile-summary-copy">
                <strong>{formatDutyDate(date)}</strong>
                <small>{daySummaryMeta(date, week)}</small>
              </span>
              <span className="mobile-summary-action">
                {date === today ? 'Hôm nay' : 'Xem'}
                <ChevronDown size={20} aria-hidden="true" />
              </span>
            </summary>
            <DaySummary date={date} week={week} />
          </details>
        ))}
      </div>
    </div>
  );
}
