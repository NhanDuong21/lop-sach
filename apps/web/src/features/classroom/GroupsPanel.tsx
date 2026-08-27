import type { Classroom } from '@lop-sach/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { Notice } from '../../components/ui/Notice.js';
import { listStudents } from '../students/students.api.js';
import { addGroup, patchGroup, setGroupActive } from './classroom.api.js';

export function GroupsPanel({ classroom }: { readonly classroom: Classroom }): React.JSX.Element {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [names, setNames] = useState<Record<string, string>>({});
  const [deactivateId, setDeactivateId] = useState<string>();
  const [editingId, setEditingId] = useState<string>();
  const [reordering, setReordering] = useState(false);
  const students = useQuery({ queryKey: ['students'], queryFn: listStudents });
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
    mutation.mutate(() => patchGroup(groupId, { name, expectedVersion: classroom.version }), {
      onSuccess: () => setEditingId(undefined),
    });
  };
  const move = (groupId: string, order: number): void =>
    mutation.mutate(() => patchGroup(groupId, { order, expectedVersion: classroom.version }));
  return (
    <section className="panel-section" aria-labelledby="groups-title">
      <div className="section-heading">
        <div>
          <h2 id="groups-title">Các tổ trong lớp</h2>
          <p>Tên tổ có thể đổi; lịch sử cũ vẫn giữ đúng tổ đã phân công.</p>
        </div>
        <Button variant="secondary" onClick={() => setReordering((current) => !current)}>
          {reordering ? 'Xong sắp xếp' : 'Sắp xếp'}
        </Button>
      </div>
      {mutation.isError ? (
        <Notice tone="error">
          Không thể lưu thay đổi tổ. Hãy tải lại nếu dữ liệu vừa được sửa ở nơi khác.
        </Notice>
      ) : null}
      {students.isError ? (
        <Notice tone="warning">
          Chưa kiểm tra được số học sinh. Thao tác ngừng sử dụng tổ đang tạm khóa.
        </Notice>
      ) : null}
      <div className="group-list">
        {ordered.map((group, index) => {
          const activeStudentCount =
            students.data?.filter((student) => student.active && student.groupId === group.id)
              .length ?? 0;
          const editing = editingId === group.id;
          return (
            <div className="group-row" key={group.id}>
              <div className="grow group-summary">
                {editing ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <strong>{group.name}</strong>
                    <span>{activeStudentCount} học sinh đang tham gia</span>
                  </>
                )}
              </div>
              <span
                className={`status-badge ${group.active ? 'status-success' : 'status-neutral'}`}
              >
                {group.active ? 'Đang sử dụng' : 'Ngừng sử dụng'}
              </span>
              <div className="icon-actions">
                {editing ? (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => setEditingId(undefined)}
                      disabled={mutation.isPending}
                    >
                      Hủy
                    </Button>
                    <Button
                      onClick={() => saveName(group.id)}
                      disabled={mutation.isPending || !group.active}
                    >
                      Lưu tên
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setNames((current) => ({ ...current, [group.id]: group.name }));
                      setEditingId(group.id);
                    }}
                    disabled={!group.active}
                  >
                    Sửa
                  </Button>
                )}
                {reordering ? (
                  <>
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
                  </>
                ) : null}
                <Button
                  variant="secondary"
                  title={
                    group.active
                      ? students.isSuccess
                        ? activeStudentCount > 0
                          ? `Không thể ngừng sử dụng vì còn ${activeStudentCount} học sinh.`
                          : undefined
                        : 'Đang kiểm tra số học sinh của tổ.'
                      : undefined
                  }
                  disabled={
                    mutation.isPending ||
                    (group.active && (!students.isSuccess || activeStudentCount > 0))
                  }
                  onClick={() =>
                    group.active
                      ? setDeactivateId(group.id)
                      : mutation.mutate(() => setGroupActive(group.id, true, classroom.version))
                  }
                >
                  {group.active ? 'Ngừng sử dụng' : 'Sử dụng lại'}
                </Button>
              </div>
              {group.active && activeStudentCount > 0 ? (
                <p className="group-action-help">
                  Không thể ngừng sử dụng vì còn {activeStudentCount} học sinh.{' '}
                  <Link to={`/class/students?groupId=${encodeURIComponent(group.id)}`}>
                    Xem học sinh
                  </Link>
                </p>
              ) : null}
            </div>
          );
        })}
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
        title="Ngừng sử dụng tổ này?"
        description="Tổ sẽ không còn xuất hiện khi tạo tuần mới. Lịch sử cũ vẫn được giữ."
        confirmLabel="Ngừng sử dụng"
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
