import type { Classroom } from '@lop-sach/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/Button.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { Notice } from '../../components/ui/Notice.js';
import { addGroup, patchGroup, setGroupActive } from './classroom.api.js';

export function GroupsPanel({ classroom }: { readonly classroom: Classroom }): React.JSX.Element {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [names, setNames] = useState<Record<string, string>>({});
  const [deactivateId, setDeactivateId] = useState<string>();
  const updateCache = (next: Classroom): void => {
    queryClient.setQueryData(['classroom'], next);
  };
  const mutation = useMutation({
    mutationFn: async (operation: () => Promise<Classroom>) => operation(),
    onSuccess: updateCache,
  });
  const ordered = [...classroom.groups].sort((left, right) => left.order - right.order);
  const saveName = (groupId: string): void => {
    const name = names[groupId]?.trim();
    if (!name) return;
    mutation.mutate(() => patchGroup(groupId, { name, expectedVersion: classroom.version }));
  };
  const move = (groupId: string, order: number): void =>
    mutation.mutate(() => patchGroup(groupId, { order, expectedVersion: classroom.version }));
  return (
    <section className="panel-section" aria-labelledby="groups-title">
      <div className="section-heading">
        <div>
          <h2 id="groups-title">Các tổ trong lớp</h2>
          <p>Tên có thể đổi, mã tổ ổn định để bảo vệ lịch sử.</p>
        </div>
      </div>
      {mutation.isError ? (
        <Notice tone="error">
          Không thể lưu thay đổi tổ. Hãy tải lại nếu dữ liệu vừa được sửa ở nơi khác.
        </Notice>
      ) : null}
      <div className="group-list">
        {ordered.map((group, index) => (
          <div className="group-row" key={group.id}>
            <div className="grow">
              <label className="sr-only" htmlFor={`group-${group.id}`}>
                Tên {group.name}
              </label>
              <input
                id={`group-${group.id}`}
                value={names[group.id] ?? group.name}
                onChange={(event) =>
                  setNames((current) => ({ ...current, [group.id]: event.target.value }))
                }
                disabled={!group.active}
              />
            </div>
            <span className={`status-badge ${group.active ? 'status-success' : 'status-neutral'}`}>
              {group.active ? 'Đang dùng' : 'Đã tắt'}
            </span>
            <div className="icon-actions">
              <Button
                variant="secondary"
                aria-label={`Lưu ${group.name}`}
                onClick={() => saveName(group.id)}
                disabled={mutation.isPending || !group.active}
              >
                <Save size={17} />
              </Button>
              <Button
                variant="secondary"
                aria-label={`Đưa ${group.name} lên`}
                onClick={() => move(group.id, index - 1)}
                disabled={mutation.isPending || index === 0}
              >
                <ArrowUp size={17} />
              </Button>
              <Button
                variant="secondary"
                aria-label={`Đưa ${group.name} xuống`}
                onClick={() => move(group.id, index + 1)}
                disabled={mutation.isPending || index === ordered.length - 1}
              >
                <ArrowDown size={17} />
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  group.active
                    ? setDeactivateId(group.id)
                    : mutation.mutate(() => setGroupActive(group.id, true, classroom.version))
                }
              >
                {group.active ? 'Tắt' : 'Bật'}
              </Button>
            </div>
          </div>
        ))}
      </div>
      <form
        className="inline-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (newName.trim())
            mutation.mutate(
              () => addGroup({ name: newName.trim(), expectedVersion: classroom.version }),
              { onSuccess: () => setNewName('') },
            );
        }}
      >
        <label className="sr-only" htmlFor="new-group">
          Tên tổ mới
        </label>
        <input
          id="new-group"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Tên tổ mới"
          maxLength={40}
        />
        <Button type="submit" disabled={!newName.trim() || mutation.isPending}>
          <Plus size={17} />
          Thêm tổ
        </Button>
      </form>
      <ConfirmDialog
        open={Boolean(deactivateId)}
        title="Tắt tổ này?"
        description="Tổ chỉ có thể tắt khi không còn học sinh đang hoạt động. Lịch sử cũ vẫn được giữ."
        confirmLabel="Tắt tổ"
        onCancel={() => setDeactivateId(undefined)}
        onConfirm={() => {
          const id = deactivateId;
          setDeactivateId(undefined);
          if (id) mutation.mutate(() => setGroupActive(id, false, classroom.version));
        }}
      />
    </section>
  );
}
