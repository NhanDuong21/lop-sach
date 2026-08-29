import type { DutyWeek } from '@lop-sach/contracts';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/Button.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import { formatDutyDate } from '../../lib/date-labels.js';
import { workloadLabels } from '../../lib/vietnamese-labels.js';
import { AssignmentEditor } from './AssignmentEditor.js';
import type { AssignmentStudentOption } from './AssignmentEditor.js';

export function DayCard({
  date,
  occurrences,
  week,
  disabled,
  selectedSwapSlots,
  assignmentStudents,
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
  readonly assignmentStudents: readonly AssignmentStudentOption[];
  readonly onAssign: (slotId: string, studentId: string | null) => void;
  readonly onLock: (slotId: string, locked: boolean) => void;
  readonly onReplacement: (slotId: string) => void;
  readonly onToggleSwap: (slotId: string) => void;
  readonly onToggleOccurrence: (occurrenceId: string, enabled: boolean) => void;
  readonly onDeleteOccurrence: (occurrenceId: string) => void;
}): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const enabledOccurrences = occurrences.filter((item) => item.enabled);
  const missingCount = enabledOccurrences.reduce(
    (total, occurrence) =>
      total +
      occurrence.slots.filter(
        (slot) =>
          !week.assignments.some(
            (assignment) => assignment.slotId === slot.id && assignment.studentId !== null,
          ),
      ).length,
    0,
  );
  return (
    <section className="day-card card">
      <header className="day-header">
        <div>
          <h2>{formatDutyDate(date)}</h2>
          <span className={missingCount > 0 ? 'day-needs-review' : 'day-complete'}>
            {missingCount > 0 ? `Còn ${missingCount} người chưa chọn` : 'Đủ người'}
          </span>
        </div>
        <div className="button-row">
          {missingCount > 0 ? <StatusBadge tone="warning">Cần xem lại</StatusBadge> : null}
          <Button variant="secondary" onClick={() => setEditing((current) => !current)}>
            <Pencil size={16} aria-hidden="true" />
            {editing ? 'Xong' : missingCount > 0 ? 'Chọn người' : 'Chỉnh ngày này'}
          </Button>
        </div>
      </header>
      {!editing ? (
        <div className="compact-day-tasks">
          {enabledOccurrences.map((occurrence) => {
            const performers = occurrence.slots.map(
              (slot) =>
                week.assignments.find((assignment) => assignment.slotId === slot.id)
                  ?.studentDisplayName ?? 'Chưa phân công',
            );
            return (
              <div className="compact-day-task" key={occurrence.id}>
                <strong>{occurrence.taskName}</strong>
                <span className={performers.includes('Chưa phân công') ? 'missing-assignment' : ''}>
                  {performers.join(', ')}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="occurrence-list">
          {assignmentStudents.some((student) => student.groupId !== week.selectedGroupId) ? (
            <p className="muted">
              Chọn học sinh ngoài tổ để giáo viên chỉ định vào một vị trí có sẵn. Lượt này không
              tính điểm cân bằng và không làm tăng số người của công việc.
            </p>
          ) : null}
          {occurrences.map((occurrence) => (
            <article
              className={`occurrence${occurrence.enabled ? '' : ' occurrence-disabled'}`}
              key={occurrence.id}
            >
              <div className="occurrence-heading">
                <div>
                  <h3>{occurrence.taskName}</h3>
                  <p>
                    {workloadLabels[occurrence.workloadLevel]} · {occurrence.requiredStudents} học
                    sinh
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
                      students={assignmentStudents}
                      selectedGroupId={week.selectedGroupId}
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
      )}
    </section>
  );
}
