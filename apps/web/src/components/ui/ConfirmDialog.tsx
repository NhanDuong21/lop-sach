import { Button } from './Button.js';

export function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onCancel }: { readonly open: boolean; readonly title: string; readonly description: string; readonly confirmLabel: string; readonly onConfirm: () => void; readonly onCancel: () => void }): React.JSX.Element | null {
  if (!open) return null;
  return <div className="dialog-backdrop" role="presentation"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><h2 id="confirm-title">{title}</h2><p>{description}</p><div className="button-row"><Button variant="secondary" onClick={onCancel}>Hủy</Button><Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button></div></section></div>;
}
