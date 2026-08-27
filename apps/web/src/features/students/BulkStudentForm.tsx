import type { Group } from '@lop-sach/contracts';
import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button.js';
import { Notice } from '../../components/ui/Notice.js';

export function BulkStudentForm({
  groups,
  pending,
  onSubmit,
  onCancel,
}: {
  readonly groups: readonly Group[];
  readonly pending?: boolean;
  readonly onSubmit: (input: { readonly groupId: string; readonly displayNames: string[] }) => void;
  readonly onCancel: () => void;
}): React.JSX.Element {
  const [groupId, setGroupId] = useState(groups.find((group) => group.active)?.id ?? '');
  const [rawNames, setRawNames] = useState('');
  const displayNames = useMemo(
    () =>
      rawNames
        .split(/\r?\n/u)
        .map((name) => name.trim())
        .filter(Boolean),
    [rawNames],
  );
  const duplicateCount =
    displayNames.length - new Set(displayNames.map((name) => name.toLocaleLowerCase('vi-VN'))).size;

  return (
    <form
      className="editor-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (groupId && displayNames.length > 0 && duplicateCount === 0) {
          onSubmit({ groupId, displayNames });
        }
      }}
    >
      <div>
        <label htmlFor="bulk-student-group">Thêm vào tổ</label>
        <select
          id="bulk-student-group"
          value={groupId}
          onChange={(event) => setGroupId(event.target.value)}
        >
          {groups
            .filter((group) => group.active)
            .map((group) => (
              <option value={group.id} key={group.id}>
                {group.name}
              </option>
            ))}
        </select>
      </div>
      <div>
        <label htmlFor="bulk-student-names">Họ và tên, mỗi học sinh một dòng</label>
        <textarea
          id="bulk-student-names"
          rows={8}
          maxLength={4860}
          value={rawNames}
          placeholder={'Nguyễn Văn An\nTrần Thị Bình\nLê Minh Châu'}
          onChange={(event) => setRawNames(event.target.value)}
        />
        <p className="field-help">
          Đã nhận {displayNames.length} tên. Giới tính để “Chưa xác định”, chưa có hạn chế và đều
          đang tham gia.
        </p>
      </div>
      {displayNames.length > 60 ? (
        <Notice tone="error">Mỗi lần thêm tối đa 60 học sinh.</Notice>
      ) : null}
      {duplicateCount > 0 ? (
        <Notice tone="error">Có tên bị lặp trong danh sách. Hãy giữ mỗi học sinh một dòng.</Notice>
      ) : null}
      <div className="button-row">
        <Button variant="secondary" onClick={onCancel}>
          Hủy
        </Button>
        <Button
          type="submit"
          disabled={
            pending ||
            !groupId ||
            displayNames.length === 0 ||
            displayNames.length > 60 ||
            duplicateCount > 0
          }
        >
          Thêm {displayNames.length || ''} học sinh
        </Button>
      </div>
    </form>
  );
}
