import type { Student } from '@lop-sach/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ListPlus, Plus, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { LoadingState } from '../../components/ui/LoadingState.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { ModalDialog } from '../../components/ui/ModalDialog.js';
import { Notice } from '../../components/ui/Notice.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import { getClassroom } from '../classroom/classroom.api.js';
import { listTasks } from '../tasks/tasks.api.js';
import { BulkStudentForm } from './BulkStudentForm.js';
import { StudentForm } from './StudentForm.js';
import {
  createStudent,
  createStudents,
  listStudents,
  moveStudent,
  patchStudent,
  setStudentActive,
  type StudentWriteInput,
} from './students.api.js';

export function StudentsPage({
  compact = false,
}: {
  readonly compact?: boolean;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const classroom = useQuery({ queryKey: ['classroom'], queryFn: getClassroom });
  const students = useQuery({ queryKey: ['students'], queryFn: listStudents });
  const tasks = useQuery({ queryKey: ['tasks'], queryFn: listTasks });
  const [editing, setEditing] = useState<Student | 'new' | 'bulk'>();
  const [activeTarget, setActiveTarget] = useState<Student>();
  const [groupFilter, setGroupFilter] = useState(searchParams.get('groupId') ?? 'ALL');
  const update = useMutation({
    mutationFn: async ({
      input,
      student,
    }: {
      readonly input: StudentWriteInput;
      readonly student?: Student;
    }) => {
      if (!student) return createStudent(input);
      const patched = await patchStudent(student.id, {
        displayName: input.displayName,
        gender: input.gender,
        participationStart: input.participationStart,
        participationEnd: input.participationEnd,
        restrictions: input.restrictions,
        expectedVersion: student.version,
      });
      return input.groupId !== student.groupId
        ? moveStudent(student.id, input.groupId, patched.version)
        : patched;
    },
    onSuccess: () => {
      setEditing(undefined);
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      void queryClient.invalidateQueries({ queryKey: ['classroom'] });
    },
  });
  const activeMutation = useMutation({
    mutationFn: (student: Student) =>
      setStudentActive(student.id, !student.active, student.version),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      void queryClient.invalidateQueries({ queryKey: ['classroom'] });
    },
  });
  const bulkCreate = useMutation({
    mutationFn: createStudents,
    onSuccess: () => {
      setEditing(undefined);
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      void queryClient.invalidateQueries({ queryKey: ['classroom'] });
    },
  });
  if (classroom.isPending || students.isPending || tasks.isPending) return <LoadingState />;
  if (!classroom.data || !students.data || !tasks.data)
    return <Notice tone="error">Không tải được danh sách học sinh.</Notice>;
  const filtered =
    groupFilter === 'ALL'
      ? students.data
      : students.data.filter((student) => student.groupId === groupFilter);
  return (
    <div className="page-stack">
      {compact ? null : (
        <header className="page-heading">
          <p className="eyebrow">Lớp học</p>
          <h1>Học sinh</h1>
          <p>Chỉ lưu thông tin cần thiết để phân công trực nhật.</p>
        </header>
      )}
      <section className="card">
        <div className="section-heading">
          <div>
            <h2>Danh sách học sinh</h2>
            <p>
              {students.data.filter((student) => student.active).length} học sinh đang hoạt động
            </p>
          </div>
          <div className="button-row">
            <Button
              variant="secondary"
              onClick={() => {
                update.reset();
                bulkCreate.reset();
                setEditing('new');
              }}
            >
              <Plus size={17} />
              Thêm một bạn
            </Button>
            <Button
              onClick={() => {
                update.reset();
                bulkCreate.reset();
                setEditing('bulk');
              }}
            >
              <ListPlus size={17} />
              Thêm nhanh nhiều bạn
            </Button>
          </div>
        </div>
        <label htmlFor="group-filter">Lọc theo tổ</label>
        <select
          id="group-filter"
          value={groupFilter}
          onChange={(event) => setGroupFilter(event.target.value)}
        >
          <option value="ALL">Tất cả tổ</option>
          {classroom.data.groups.map((group) => (
            <option value={group.id} key={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        {update.isError || activeMutation.isError || bulkCreate.isError ? (
          <Notice tone="error">
            Không thể lưu học sinh. Hãy kiểm tra phiên bản dữ liệu và thử lại.
          </Notice>
        ) : null}
        <div className="entity-list">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <UserRound size={28} aria-hidden="true" />
              <h3>Chưa có học sinh trong danh sách này</h3>
              <p>Thêm học sinh và chọn đúng tổ để bắt đầu.</p>
            </div>
          ) : (
            filtered.map((student) => (
              <article className="entity-row" key={student.id}>
                <div>
                  <strong>{student.displayName}</strong>
                  <p>
                    {classroom.data.groups.find((group) => group.id === student.groupId)?.name ??
                      'Tổ đã lưu'}{' '}
                    · {student.restrictions.length} hạn chế
                  </p>
                </div>
                <StatusBadge tone={student.active ? 'success' : 'neutral'}>
                  {student.active ? 'Đang tham gia' : 'Ngừng tham gia'}
                </StatusBadge>
                <div className="button-row">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      update.reset();
                      bulkCreate.reset();
                      setEditing(student);
                    }}
                  >
                    Sửa
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      student.active ? setActiveTarget(student) : activeMutation.mutate(student)
                    }
                  >
                    {student.active ? 'Ngừng tham gia' : 'Tham gia lại'}
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
      <ModalDialog
        open={Boolean(editing)}
        title={
          editing === 'new'
            ? 'Thêm một học sinh'
            : editing === 'bulk'
              ? 'Thêm nhanh nhiều học sinh'
              : editing
                ? `Sửa ${editing.displayName}`
                : 'Học sinh'
        }
        description={
          editing === 'bulk'
            ? 'Chọn một tổ và nhập mỗi học sinh trên một dòng.'
            : 'Thông tin thay đổi sẽ được dùng cho các tuần tạo sau khi lưu.'
        }
        size={editing === 'bulk' ? 'default' : 'wide'}
        closeDisabled={update.isPending || bulkCreate.isPending}
        onClose={() => {
          update.reset();
          bulkCreate.reset();
          setEditing(undefined);
        }}
      >
        {editing ? (
          <>
            {update.isError || bulkCreate.isError ? (
              <Notice tone="error">Không thể lưu học sinh. Hãy kiểm tra dữ liệu và thử lại.</Notice>
            ) : null}
            {editing === 'bulk' ? (
              <BulkStudentForm
                groups={classroom.data.groups}
                pending={bulkCreate.isPending}
                onCancel={() => {
                  bulkCreate.reset();
                  setEditing(undefined);
                }}
                onSubmit={(input) => bulkCreate.mutate(input)}
              />
            ) : (
              <StudentForm
                key={editing === 'new' ? 'new' : editing.id}
                groups={classroom.data.groups}
                tasks={tasks.data}
                {...(editing === 'new' ? {} : { student: editing })}
                pending={update.isPending}
                onCancel={() => {
                  update.reset();
                  setEditing(undefined);
                }}
                onSubmit={(input) =>
                  update.mutate({ input, ...(editing === 'new' ? {} : { student: editing }) })
                }
              />
            )}
          </>
        ) : null}
      </ModalDialog>
      <ConfirmDialog
        open={Boolean(activeTarget)}
        title="Ngừng cho học sinh tham gia?"
        description={`${activeTarget?.displayName ?? 'Học sinh này'} sẽ không được đưa vào các tuần trực mới. Lịch sử cũ vẫn được giữ.`}
        confirmLabel="Ngừng tham gia"
        onCancel={() => setActiveTarget(undefined)}
        onConfirm={() => {
          const student = activeTarget;
          setActiveTarget(undefined);
          if (student) activeMutation.mutate(student);
        }}
      />
    </div>
  );
}
