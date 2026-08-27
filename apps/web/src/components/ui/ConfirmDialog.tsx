import { Button } from './Button.js';
import { ModalDialog } from './ModalDialog.js';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  readonly open: boolean;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}): React.JSX.Element | null {
  return (
    <ModalDialog
      open={open}
      title={title}
      description={description}
      size="small"
      onClose={onCancel}
    >
      <div className="button-row modal-actions">
        <Button variant="secondary" onClick={onCancel}>
          Hủy
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </ModalDialog>
  );
}
