import type { DutyWeek } from '@lop-sach/contracts';
import { CircleHelp, Lock, LockOpen, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/Button.js';

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
        <label htmlFor={`assignment-${slotId}`}>Vị trí {slotIndex + 1}</label>
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
            {assignment.explanation.length > 0 ? (
              <button
                type="button"
                className="text-action"
                aria-expanded={explanationOpen}
                onClick={() => setExplanationOpen((current) => !current)}
              >
                <CircleHelp size={15} aria-hidden="true" /> Vì sao phân công?
              </button>
            ) : null}
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
          <Button
            variant="secondary"
            aria-label={assignment.locked ? 'Mở khóa phân công' : 'Khóa phân công'}
            disabled={disabled}
            onClick={() => onLock(!assignment.locked)}
          >
            {assignment.locked ? (
              <LockOpen size={16} aria-hidden="true" />
            ) : (
              <Lock size={16} aria-hidden="true" />
            )}
          </Button>
          <Button
            variant="secondary"
            disabled={disabled || assignment.locked}
            onClick={onReplacement}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Thay
          </Button>
          <Button
            variant="secondary"
            disabled={disabled || assignment.locked}
            aria-pressed={swapSelected}
            onClick={onToggleSwap}
          >
            Hoán đổi
          </Button>
        </div>
      ) : null}
    </div>
  );
}
