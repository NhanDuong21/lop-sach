import { useQuery } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button.js';
import { LoadingState } from '../../components/ui/LoadingState.js';
import { ModalDialog } from '../../components/ui/ModalDialog.js';
import { Notice } from '../../components/ui/Notice.js';
import { getReplacementSuggestions } from './duty-weeks.api.js';

export function ReplacementDialog({
  weekId,
  slotId,
  studentNames,
  pending,
  onSelect,
  onCancel,
}: {
  readonly weekId: string;
  readonly slotId: string | null;
  readonly studentNames: ReadonlyMap<string, string>;
  readonly pending: boolean;
  readonly onSelect: (studentId: string) => void;
  readonly onCancel: () => void;
}): React.JSX.Element | null {
  const suggestions = useQuery({
    queryKey: ['duty-week', weekId, 'replacements', slotId],
    queryFn: () => getReplacementSuggestions(weekId, slotId ?? ''),
    enabled: slotId !== null,
  });
  return (
    <ModalDialog
      open={slotId !== null}
      title="Chọn người thay thế"
      description="Các gợi ý đã áp dụng cùng điều kiện bắt buộc và lịch hiện tại."
      size="small"
      closeDisabled={pending}
      onClose={onCancel}
    >
      {suggestions.isPending ? (
        <LoadingState label="Đang xếp hạng người thay thế" />
      ) : suggestions.isError ? (
        <Notice tone="error">Không tải được gợi ý thay thế.</Notice>
      ) : suggestions.data?.length ? (
        <div className="replacement-list">
          {suggestions.data.map((suggestion) => (
            <button
              className="replacement-option"
              type="button"
              key={suggestion.studentId}
              onClick={() => onSelect(suggestion.studentId)}
              disabled={pending}
            >
              <strong>{studentNames.get(suggestion.studentId) ?? 'Học sinh trong tổ'}</strong>
              {suggestion.explanations.slice(0, 2).map((reason) => (
                <span key={reason}>{reason}</span>
              ))}
            </button>
          ))}
        </div>
      ) : (
        <Notice tone="warning">Không có người thay thế phù hợp.</Notice>
      )}
      <div className="button-row modal-actions">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Đóng
        </Button>
      </div>
    </ModalDialog>
  );
}
