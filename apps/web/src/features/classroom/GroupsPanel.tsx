import type { Classroom } from '@lop-sach/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, Users } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/Button.js';
import { ActionMenu } from '../../components/ui/ActionMenu.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { InitialAvatar } from '../../components/ui/InitialAvatar.js';
import { ModalDialog } from '../../components/ui/ModalDialog.js';
import { Notice } from '../../components/ui/Notice.js';
import { listStudents } from '../students/students.api.js';
import { addGroup, patchGroup, setGroupActive } from './classroom.api.js';

export function GroupsPanel({ classroom }: { readonly classroom: Classroom }): React.JSX.Element {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [names, setNames] = useState<Record<string, string>>({});
  const [deactivateId, setDeactivateId] = useState<string>();
  const [editingId, setEditingId] = useState<string>();
  const [adding, setAdding] = useState(false);
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
  const editingGroup = ordered.find((group) => group.id === editingId);
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
    <section className="panel-section class-groups-panel" aria-labelledby="groups-title">
      <div className="section-heading">
        <div className="class-panel-heading-copy">
          <Users size={23} aria-hidden="true" />
          <div>
            <h2 id="groups-title">Các tổ trong lớp</h2>
            <p>Tên tổ có thể đổi; lịch sử cũ vẫn giữ đúng tổ đã phân công.</p>
          </div>
        </div>
        <div className="button-row">
          <Button
            variant="secondary"
            onClick={() => {
              mutation.reset();
              setNewName('');
              setAdding(true);
            }}
          >
            <Plus size={17} />
            Thêm tổ
          </Button>
          <Button variant="secondary" onClick={() => setReordering((current) => !current)}>
            {reordering ? 'Xong sắp xếp' : 'Sắp xếp'}
          </Button>
        </div>
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
      {reordering ? (
        <Notice>
          Dùng mũi tên để đổi thứ tự. Thay đổi được lưu ngay; bấm “Xong sắp xếp” khi hoàn tất.
        </Notice>
      ) : null}
      <div className="group-list">
        {ordered.map((group, index) => {
          const activeStudentCount =
            students.data?.filter((student) => student.active && student.groupId === group.id)
              .length ?? 0;
          return (
            <article className="group-row" key={group.id}>
              <div className="group-card-identity">
                <InitialAvatar name={group.name} />
                <div className="group-summary">
                  <strong>{group.name}</strong>
                  <span>{activeStudentCount} học sinh</span>
                </div>
              </div>
              {!group.active ? <span className="status-badge">Ngừng sử dụng</span> : null}
              <div className="icon-actions">
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
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        mutation.reset();
                        setNames((current) => ({ ...current, [group.id]: group.name }));
                        setEditingId(group.id);
                      }}
                      disabled={!group.active}
                    >
                      Sửa
                    </Button>
                    <ActionMenu
                      label={`Tùy chọn cho ${group.name}`}
                      items={[
                        group.active
                          ? {
                              label: 'Ngừng sử dụng',
                              danger: true,
                              disabled:
                                mutation.isPending || !students.isSuccess || activeStudentCount > 0,
                              ...(activeStudentCount > 0
                                ? {
                                    hint: `Cần chuyển hoặc ngừng tham gia ${activeStudentCount} học sinh trước.`,
                                  }
                                : {}),
                              onSelect: () => setDeactivateId(group.id),
                            }
                          : {
                              label: 'Sử dụng lại',
                              disabled: mutation.isPending,
                              onSelect: () =>
                                mutation.mutate(() =>
                                  setGroupActive(group.id, true, classroom.version),
                                ),
                            },
                      ]}
                    />
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <ModalDialog
        open={adding}
        title="Thêm tổ"
        description="Tổ mới sẽ xuất hiện khi chọn tổ trực và thêm học sinh."
        size="small"
        closeDisabled={mutation.isPending}
        onClose={() => {
          mutation.reset();
          setAdding(false);
        }}
      >
        {mutation.isError ? (
          <Notice tone="error">Không thể thêm tổ. Hãy tải lại dữ liệu và thử lại.</Notice>
        ) : null}
        <form
          className="editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (newName.trim())
              mutation.mutate(
                () => addGroup({ name: newName.trim(), expectedVersion: classroom.version }),
                {
                  onSuccess: () => {
                    setNewName('');
                    setAdding(false);
                  },
                },
              );
          }}
        >
          <div>
            <label htmlFor="new-group">Tên tổ mới</label>
            <input
              id="new-group"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Ví dụ: Tổ 5"
              maxLength={40}
              required
            />
          </div>
          <div className="button-row modal-actions">
            <Button
              variant="secondary"
              onClick={() => {
                mutation.reset();
                setAdding(false);
              }}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={!newName.trim() || mutation.isPending}>
              Thêm tổ
            </Button>
          </div>
        </form>
      </ModalDialog>
      <ModalDialog
        open={Boolean(editingGroup)}
        title={`Sửa ${editingGroup?.name ?? 'tên tổ'}`}
        description="Tên mới chỉ áp dụng cho dữ liệu hiện tại; lịch sử cũ giữ tên đã lưu."
        size="small"
        closeDisabled={mutation.isPending}
        onClose={() => {
          mutation.reset();
          setEditingId(undefined);
        }}
      >
        {editingGroup ? (
          <form
            className="editor-form"
            onSubmit={(event) => {
              event.preventDefault();
              saveName(editingGroup.id);
            }}
          >
            {mutation.isError ? (
              <Notice tone="error">Không thể đổi tên tổ. Hãy tải lại và thử lại.</Notice>
            ) : null}
            <div>
              <label htmlFor="group-dialog-name">Tên tổ</label>
              <input
                id="group-dialog-name"
                value={names[editingGroup.id] ?? editingGroup.name}
                onChange={(event) =>
                  setNames((current) => ({
                    ...current,
                    [editingGroup.id]: event.target.value,
                  }))
                }
                maxLength={40}
                required
              />
            </div>
            <div className="button-row modal-actions">
              <Button
                variant="secondary"
                onClick={() => {
                  mutation.reset();
                  setEditingId(undefined);
                }}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={
                  mutation.isPending || !(names[editingGroup.id] ?? editingGroup.name).trim()
                }
              >
                Lưu tên
              </Button>
            </div>
          </form>
        ) : null}
      </ModalDialog>
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
