import type { DutyWeek } from '@lop-sach/contracts';
import { Button } from '../../components/ui/Button.js';
import { ModalDialog } from '../../components/ui/ModalDialog.js';
import { warningCountText } from '../../lib/week-warnings.js';

export function PublishDialog({
  week,
  open,
  pending,
  onConfirm,
  onCancel,
}: {
  readonly week: DutyWeek;
  readonly open: boolean;
  readonly pending: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}): React.JSX.Element | null {
  return (
    <ModalDialog
      open={open}
      title="Phát hành lịch tuần?"
      description={`Lịch của ${week.groupSnapshot.name} sẽ chuyển sang chỉ đọc và không thể tạo lại.${
        week.publicationRevision > 0 ? ` Đây là lần công bố ${week.publicationRevision + 1}.` : ''
      }`}
      size="small"
      closeDisabled={pending}
      onClose={onCancel}
    >
      {week.warnings.length > 0 ? (
        <p className="muted">Có {warningCountText(week)} đã hiển thị trong lịch.</p>
      ) : null}
      <div className="button-row modal-actions">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Hủy
        </Button>
        <Button
          onClick={onConfirm}
          disabled={pending || week.requiresGeneration || week.generationStale}
        >
          Phát hành
        </Button>
      </div>
    </ModalDialog>
  );
}
