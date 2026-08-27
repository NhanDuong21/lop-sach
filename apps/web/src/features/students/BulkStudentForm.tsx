import type { Group } from '@lop-sach/contracts';
import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button.js';
import { Notice } from '../../components/ui/Notice.js';

export function BulkStudentForm({
  groups,
  existingNames = [],
  pending,
  onSubmit,
  onCancel,
}: {
  readonly groups: readonly Group[];
  readonly existingNames?: readonly string[];
  readonly pending?: boolean;
  readonly onSubmit: (input: { readonly groupId: string; readonly displayNames: string[] }) => void;
  readonly onCancel: () => void;
}): React.JSX.Element {
  const [groupId, setGroupId] = useState(groups.find((group) => group.active)?.id ?? '');
  const [rawNames, setRawNames] = useState('');
  const [preview, setPreview] = useState(false);
  const displayNames = useMemo(
    () =>
      rawNames
        .split(/\r?\n/u)
        .map((name) => name.trim())
        .filter(Boolean),
    [rawNames],
  );
  const normalizedNames = displayNames.map((name) => name.toLocaleLowerCase('vi-VN'));
  const duplicateNames = [
    ...new Set(
      displayNames.filter(
        (_, index) => normalizedNames.indexOf(normalizedNames[index] ?? '') !== index,
      ),
    ),
  ];
  const uniqueNames = displayNames.filter(
    (_, index) => normalizedNames.indexOf(normalizedNames[index] ?? '') === index,
  );
  const existingSet = new Set(existingNames.map((name) => name.toLocaleLowerCase('vi-VN')));
  const existingDuplicates = uniqueNames.filter((name) =>
    existingSet.has(name.toLocaleLowerCase('vi-VN')),
  );
  const validNames = uniqueNames.filter(
    (name) => !existingSet.has(name.toLocaleLowerCase('vi-VN')),
  );

  return (
    <form
      className="editor-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!preview) {
          if (groupId && displayNames.length > 0 && duplicateNames.length === 0) setPreview(true);
        } else if (groupId && validNames.length > 0) {
          onSubmit({ groupId, displayNames: validNames });
        }
      }}
    >
      {!preview ? (
        <>
          <div>
            <label htmlFor="bulk-student-group">Thêm vào tổ</label>
            <select
              id="bulk-student-group"
              value={groupId}
              onChange={(event) => {
                setGroupId(event.target.value);
                setPreview(false);
              }}
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
              onChange={(event) => {
                setRawNames(event.target.value);
                setPreview(false);
              }}
            />
            <p className="field-help">
              Đã nhận {displayNames.length} tên. Dòng trống và khoảng trắng thừa sẽ được bỏ qua.
            </p>
          </div>
        </>
      ) : (
        <div className="bulk-preview" aria-live="polite">
          <h3>Kiểm tra trước khi thêm</h3>
          <dl className="read-only-details compact">
            <div>
              <dt>Đã nhận</dt>
              <dd>{displayNames.length} tên</dd>
            </div>
            <div>
              <dt>Sẽ thêm</dt>
              <dd>{validNames.length} học sinh</dd>
            </div>
            <div>
              <dt>Tổ</dt>
              <dd>{groups.find((group) => group.id === groupId)?.name ?? 'Tổ đã chọn'}</dd>
            </div>
            <div>
              <dt>Thông tin mặc định</dt>
              <dd>Chưa xác định giới tính · Không có hạn chế</dd>
            </div>
          </dl>
          {existingDuplicates.length > 0 ? (
            <Notice tone="warning">
              Không thêm {existingDuplicates.length} tên đã có trong lớp:{' '}
              {existingDuplicates.join(', ')}.
            </Notice>
          ) : null}
        </div>
      )}
      {displayNames.length > 60 ? (
        <Notice tone="error">Mỗi lần thêm tối đa 60 học sinh.</Notice>
      ) : null}
      {duplicateNames.length > 0 ? (
        <Notice tone="error">
          Có tên bị lặp trong phần nhập: {duplicateNames.join(', ')}. Hãy giữ mỗi học sinh một dòng.
        </Notice>
      ) : null}
      <div className="button-row">
        <Button variant="secondary" onClick={() => (preview ? setPreview(false) : onCancel())}>
          {preview ? 'Quay lại' : 'Hủy'}
        </Button>
        <Button
          type="submit"
          disabled={
            pending ||
            !groupId ||
            displayNames.length === 0 ||
            displayNames.length > 60 ||
            duplicateNames.length > 0 ||
            (preview && validNames.length === 0)
          }
        >
          {preview ? `Thêm ${validNames.length} học sinh` : 'Kiểm tra danh sách'}
        </Button>
      </div>
    </form>
  );
}
