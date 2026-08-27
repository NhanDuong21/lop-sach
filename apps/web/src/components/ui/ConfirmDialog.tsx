import { Button } from './Button.js';
import { ModalDialog } from './ModalDialog.js';
import { Notice } from './Notice.js';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  pendingLabel = 'Đang xử lý…',
  error,
  onConfirm,
  onCancel,
}: {
  readonly open: boolean;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly pending?: boolean;
  readonly pendingLabel?: string;
  readonly error?: string | null;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}): React.JSX.Element | null {
  return (
    <ModalDialog
      open={open}
      title={title}
      description={description}
      size="small"
      closeDisabled={pending}
      onClose={onCancel}
    >
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="button-row modal-actions">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Hủy
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={pending}>
          {pending ? pendingLabel : confirmLabel}
        </Button>
      </div>
    </ModalDialog>
  );
}
