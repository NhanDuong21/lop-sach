import type { DutyWeek } from '@lop-sach/contracts';
import { Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import { AssignmentEditor } from './AssignmentEditor.js';

function dateLabel(date: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

export function DayCard({
  date,
  occurrences,
  week,
  disabled,
  selectedSwapSlots,
  onAssign,
  onLock,
  onReplacement,
  onToggleSwap,
  onToggleOccurrence,
  onDeleteOccurrence,
}: {
  readonly date: string;
  readonly occurrences: DutyWeek['taskOccurrences'];
  readonly week: DutyWeek;
  readonly disabled: boolean;
  readonly selectedSwapSlots: readonly string[];
  readonly onAssign: (slotId: string, studentId: string | null) => void;
  readonly onLock: (slotId: string, locked: boolean) => void;
  readonly onReplacement: (slotId: string) => void;
  readonly onToggleSwap: (slotId: string) => void;
  readonly onToggleOccurrence: (occurrenceId: string, enabled: boolean) => void;
  readonly onDeleteOccurrence: (occurrenceId: string) => void;
}): React.JSX.Element {
  return (
    <section className="day-card card">
      <header className="day-header">
        <div>
          <p className="eyebrow">{dateLabel(date)}</p>
          <h2>{date}</h2>
        </div>
        <StatusBadge>{occurrences.filter((item) => item.enabled).length} công việc</StatusBadge>
      </header>
      <div className="occurrence-list">
        {occurrences.map((occurrence) => (
          <article
            className={`occurrence${occurrence.enabled ? '' : ' occurrence-disabled'}`}
            key={occurrence.id}
          >
            <div className="occurrence-heading">
              <div>
                <h3>{occurrence.taskName}</h3>
                <p>
                  Mức {occurrence.workloadLevel} · {occurrence.requiredStudents} học sinh
                </p>
              </div>
              {week.status === 'DRAFT' ? (
                <div className="button-row">
                  <Button
                    variant="secondary"
                    onClick={() => onToggleOccurrence(occurrence.id, !occurrence.enabled)}
                    disabled={disabled}
                  >
                    {occurrence.enabled ? 'Tạm bỏ' : 'Bật lại'}
                  </Button>
                  {occurrence.source === 'ONE_OFF' ? (
                    <Button
                      variant="secondary"
                      aria-label={`Xóa ${occurrence.taskName}`}
                      disabled={disabled}
                      onClick={() => onDeleteOccurrence(occurrence.id)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
            {occurrence.enabled ? (
              <div className="assignment-list">
                {occurrence.slots.map((slot) => (
                  <AssignmentEditor
                    key={slot.id}
                    slotId={slot.id}
                    slotIndex={slot.index}
                    assignment={week.assignments.find((item) => item.slotId === slot.id)}
                    students={week.studentSnapshots}
                    disabled={disabled || week.status !== 'DRAFT'}
                    swapSelected={selectedSwapSlots.includes(slot.id)}
                    onAssign={(studentId) => onAssign(slot.id, studentId)}
                    onLock={(locked) => onLock(slot.id, locked)}
                    onReplacement={() => onReplacement(slot.id)}
                    onToggleSwap={() => onToggleSwap(slot.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="muted">Công việc này không tham gia phân công tuần.</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
