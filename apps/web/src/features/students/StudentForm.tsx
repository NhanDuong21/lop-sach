import type { Group, Student, TaskTemplate } from '@lop-sach/contracts';
import { useState } from 'react';
import { Button } from '../../components/ui/Button.js';
import { Notice } from '../../components/ui/Notice.js';
import { genderLabels } from '../../lib/vietnamese-labels.js';
import type { StudentWriteInput } from './students.api.js';

export function StudentForm({
  groups,
  tasks,
  student,
  pending,
  onSubmit,
  onCancel,
}: {
  readonly groups: readonly Group[];
  readonly tasks: readonly TaskTemplate[];
  readonly student?: Student;
  readonly pending?: boolean;
  readonly onSubmit: (input: StudentWriteInput) => void;
  readonly onCancel?: () => void;
}): React.JSX.Element {
  const firstExemption = student?.restrictions.find(
    (restriction) => restriction.type === 'EXEMPT_DATE_RANGE',
  );
  const [displayName, setDisplayName] = useState(student?.displayName ?? '');
  const [groupId, setGroupId] = useState(
    student?.groupId ?? groups.find((group) => group.active)?.id ?? '',
  );
  const [gender, setGender] = useState<Student['gender']>(student?.gender ?? 'UNSPECIFIED');
  const [participationStart, setParticipationStart] = useState(student?.participationStart ?? '');
  const [participationEnd, setParticipationEnd] = useState(student?.participationEnd ?? '');
  const [noHeavy, setNoHeavy] = useState(
    student?.restrictions.some((restriction) => restriction.type === 'NO_HEAVY_TASKS') ?? false,
  );
  const [excludedTasks, setExcludedTasks] = useState(
    () =>
      new Set(
        student?.restrictions
          .filter((restriction) => restriction.type === 'TASK_EXCLUSION')
          .map((restriction) => restriction.taskTemplateId) ?? [],
      ),
  );
  const [exemptStart, setExemptStart] = useState(
    firstExemption?.type === 'EXEMPT_DATE_RANGE' ? firstExemption.startDate : '',
  );
  const [exemptEnd, setExemptEnd] = useState(
    firstExemption?.type === 'EXEMPT_DATE_RANGE' ? firstExemption.endDate : '',
  );
  const hasAdvancedValues = Boolean(
    participationStart || participationEnd || student?.restrictions.length,
  );
  const submit = (): void => {
    const restrictions: Record<string, unknown>[] = [];
    if (noHeavy) restrictions.push({ type: 'NO_HEAVY_TASKS' });
    for (const taskTemplateId of excludedTasks)
      restrictions.push({ type: 'TASK_EXCLUSION', taskTemplateId });
    if (exemptStart && exemptEnd)
      restrictions.push({ type: 'EXEMPT_DATE_RANGE', startDate: exemptStart, endDate: exemptEnd });
    onSubmit({
      displayName: displayName.trim(),
      groupId,
      gender,
      participationStart: participationStart || null,
      participationEnd: participationEnd || null,
      restrictions,
    });
  };
  return (
    <form
      className="editor-form"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="form-grid">
        <div>
          <label htmlFor="student-name">Họ và tên</label>
          <input
            id="student-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={80}
            required
          />
        </div>
        <div>
          <label htmlFor="student-group">Tổ</label>
          <select
            id="student-group"
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
          >
            {groups
              .filter((group) => group.active || group.id === student?.groupId)
              .map((group) => (
                <option value={group.id} key={group.id}>
                  {group.name}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label htmlFor="student-gender">Giới tính (không bắt buộc)</label>
          <select
            id="student-gender"
            value={gender}
            onChange={(event) => setGender(event.target.value as Student['gender'])}
          >
            {Object.entries(genderLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <details className="advanced-settings" open={hasAdvancedValues || undefined}>
        <summary>
          <strong>Thiết lập nâng cao</strong>
          <span>Hạn chế và thời gian tham gia</span>
        </summary>
        <div className="advanced-settings-content">
          <fieldset>
            <legend>Thời gian tham gia</legend>
            <div className="form-grid">
              <div>
                <label htmlFor="participation-start">Từ ngày</label>
                <input
                  id="participation-start"
                  type="date"
                  value={participationStart ?? ''}
                  onChange={(event) => setParticipationStart(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="participation-end">Đến ngày</label>
                <input
                  id="participation-end"
                  type="date"
                  value={participationEnd ?? ''}
                  onChange={(event) => setParticipationEnd(event.target.value)}
                />
              </div>
            </div>
          </fieldset>
          <fieldset>
            <legend>Hạn chế phân công</legend>
            <Notice>
              Vắng một ngày cụ thể sẽ được đánh dấu khi tạo tuần trực, không lưu trong hồ sơ học
              sinh.
            </Notice>
            <label className="check-choice">
              <input
                type="checkbox"
                checked={noHeavy}
                onChange={(event) => setNoHeavy(event.target.checked)}
              />
              Không giao công việc nặng
            </label>
            <div className="subsection">
              <span className="field-label">Không giao công việc cụ thể</span>
              <div className="choice-grid">
                {tasks.map((task) => (
                  <label className="check-choice" key={task.id}>
                    <input
                      type="checkbox"
                      checked={excludedTasks.has(task.id)}
                      onChange={(event) =>
                        setExcludedTasks((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(task.id);
                          else next.delete(task.id);
                          return next;
                        })
                      }
                    />
                    {task.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="subsection">
              <span className="field-label">Miễn trong khoảng ngày</span>
              <div className="form-grid">
                <div>
                  <label htmlFor="exempt-start">Từ ngày</label>
                  <input
                    id="exempt-start"
                    type="date"
                    value={exemptStart}
                    onChange={(event) => setExemptStart(event.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="exempt-end">Đến ngày</label>
                  <input
                    id="exempt-end"
                    type="date"
                    value={exemptEnd}
                    onChange={(event) => setExemptEnd(event.target.value)}
                  />
                </div>
              </div>
            </div>
          </fieldset>
        </div>
      </details>
      <div className="button-row">
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel}>
            Hủy
          </Button>
        ) : null}
        <Button
          type="submit"
          disabled={
            pending ||
            !displayName.trim() ||
            !groupId ||
            Boolean(exemptStart) !== Boolean(exemptEnd)
          }
        >
          {student ? 'Lưu học sinh' : 'Thêm học sinh'}
        </Button>
      </div>
    </form>
  );
}
