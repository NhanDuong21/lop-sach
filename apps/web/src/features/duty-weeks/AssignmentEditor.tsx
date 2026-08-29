import type { DutyWeek } from '@lop-sach/contracts';
import { useState } from 'react';
import { ActionMenu } from '../../components/ui/ActionMenu.js';

type Assignment = DutyWeek['assignments'][number];

export interface AssignmentStudentOption {
  readonly id: string;
  readonly displayName: string;
  readonly groupId: string;
  readonly groupName: string;
  readonly active: boolean;
}

export function AssignmentEditor({
  slotId,
  slotIndex,
  assignment,
  students,
  selectedGroupId,
  disabled,
  swapSelected,
  onAssign,
  onLock,
  onReplacement,
  onToggleSwap,
}: {
  readonly slotId: string;
  readonly slotIndex: number;
  readonly assignment?: Assignment | undefined;
  readonly students: readonly AssignmentStudentOption[];
  readonly selectedGroupId: string;
  readonly disabled: boolean;
  readonly swapSelected: boolean;
  readonly onAssign: (studentId: string | null) => void;
  readonly onLock: (locked: boolean) => void;
  readonly onReplacement: () => void;
  readonly onToggleSwap: () => void;
}): React.JSX.Element {
  const [explanationOpen, setExplanationOpen] = useState(false);
  const selectedGroupStudents = students.filter(
    (student) => student.active && student.groupId === selectedGroupId,
  );
  const teacherAssignedStudents = students.filter(
    (student) => student.active && student.groupId !== selectedGroupId,
  );
  return (
    <div className={`assignment-row${swapSelected ? ' assignment-selected' : ''}`}>
      <div className="assignment-field">
        <label htmlFor={`assignment-${slotId}`}>Người thứ {slotIndex + 1}</label>
        <select
          id={`assignment-${slotId}`}
          value={assignment?.studentId ?? ''}
          disabled={disabled || assignment?.locked}
          onChange={(event) => onAssign(event.target.value || null)}
        >
          <option value="">Chưa phân công</option>
          <optgroup label="Tổ trực">
            {selectedGroupStudents.map((student) => (
              <option value={student.id} key={student.id}>
                {student.displayName}
              </option>
            ))}
          </optgroup>
          {teacherAssignedStudents.length > 0 ? (
            <optgroup label="Giáo viên chỉ định từ tổ khác">
              {teacherAssignedStudents.map((student) => (
                <option value={student.id} key={student.id}>
                  {student.displayName} — {student.groupName}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
        {assignment ? (
          <div className="assignment-meta">
            <small>
              {assignment.source === 'AUTO'
                ? 'Tự động'
                : assignment.source === 'TEACHER_ASSIGNED'
                  ? 'Giáo viên chỉ định · Không tính điểm cân bằng'
                  : assignment.source === 'REPLACEMENT'
                    ? 'Thay thế'
                    : assignment.source === 'SWAP'
                      ? 'Hoán đổi'
                      : 'Thủ công'}
              {assignment.locked ? ' · Đã khóa' : ''}
            </small>
            {explanationOpen ? (
              <ul className="assignment-explanation">
                {assignment.explanation.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
      {assignment ? (
        <div className="assignment-actions">
          <ActionMenu
            label={`Tùy chọn cho ${assignment.studentDisplayName ?? `người thứ ${slotIndex + 1}`}`}
            items={[
              {
                label: assignment.locked ? 'Cho phép thay khi tạo lại' : 'Giữ nguyên khi tạo lại',
                disabled,
                onSelect: () => onLock(!assignment.locked),
              },
              {
                label: 'Tìm người thay',
                disabled: disabled || assignment.locked,
                onSelect: onReplacement,
              },
              {
                label: swapSelected ? 'Bỏ chọn đổi chỗ' : 'Đổi với bạn khác',
                disabled: disabled || assignment.locked,
                onSelect: onToggleSwap,
              },
              ...(assignment.explanation.length > 0
                ? [
                    {
                      label: 'Vì sao bạn này được chọn?',
                      onSelect: () => setExplanationOpen((current) => !current),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
