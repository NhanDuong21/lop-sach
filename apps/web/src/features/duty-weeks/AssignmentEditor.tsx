import type { DutyWeek } from '@lop-sach/contracts';
import { useState } from 'react';
import { ActionMenu } from '../../components/ui/ActionMenu.js';

type Assignment = DutyWeek['assignments'][number];
type StudentSnapshot = DutyWeek['studentSnapshots'][number];

export function AssignmentEditor({
  slotId,
  slotIndex,
  assignment,
  students,
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
  readonly students: readonly StudentSnapshot[];
  readonly disabled: boolean;
  readonly swapSelected: boolean;
  readonly onAssign: (studentId: string | null) => void;
  readonly onLock: (locked: boolean) => void;
  readonly onReplacement: () => void;
  readonly onToggleSwap: () => void;
}): React.JSX.Element {
  const [explanationOpen, setExplanationOpen] = useState(false);
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
          {students
            .filter((student) => student.active)
            .map((student) => (
              <option value={student.id} key={student.id}>
                {student.displayName}
              </option>
            ))}
        </select>
        {assignment ? (
          <div className="assignment-meta">
            <small>
              {assignment.source === 'AUTO'
                ? 'Tự động'
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
