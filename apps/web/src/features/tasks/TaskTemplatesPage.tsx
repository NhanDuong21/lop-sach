import type { SchoolDay, TaskTemplate } from '@lop-sach/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ClipboardList, Plus } from 'lucide-react';
import { useState } from 'react';
import { ClassroomTabs } from '../../components/layout/ClassroomTabs.js';
import { ActionMenu } from '../../components/ui/ActionMenu.js';
import { Button } from '../../components/ui/Button.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { LoadingState } from '../../components/ui/LoadingState.js';
import { ModalDialog } from '../../components/ui/ModalDialog.js';
import { Notice } from '../../components/ui/Notice.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import { eligibilityLabels, workloadLabels } from '../../lib/vietnamese-labels.js';
import { getClassroom } from '../classroom/classroom.api.js';
import { TaskForm } from './TaskForm.js';
import {
  createTask,
  listTasks,
  patchTask,
  reorderTasks,
  setTaskActive,
  type TaskWriteInput,
} from './tasks.api.js';

const shortSchoolDayLabels: Record<SchoolDay, string> = {
  MONDAY: 'T2',
  TUESDAY: 'T3',
  WEDNESDAY: 'T4',
  THURSDAY: 'T5',
  FRIDAY: 'T6',
  SATURDAY: 'T7',
  SUNDAY: 'CN',
};

export function TaskTemplatesPage({
  compact = false,
}: {
  readonly compact?: boolean;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const classroom = useQuery({ queryKey: ['classroom'], queryFn: getClassroom });
  const tasks = useQuery({ queryKey: ['tasks'], queryFn: listTasks });
  const [editing, setEditing] = useState<TaskTemplate | 'new'>();
  const [activeTarget, setActiveTarget] = useState<TaskTemplate>();
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [reordering, setReordering] = useState(false);
  const update = useMutation({
    mutationFn: ({
      input,
      task,
    }: {
      readonly input: TaskWriteInput;
      readonly task?: TaskTemplate;
    }) =>
      task ? patchTask(task.id, { ...input, expectedVersion: task.version }) : createTask(input),
    onSuccess: () => {
      setEditing(undefined);
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['classroom'] });
    },
  });
  const activeMutation = useMutation({
    mutationFn: (task: TaskTemplate) => setTaskActive(task.id, !task.active, task.version),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['classroom'] });
    },
  });
  const reorder = useMutation({
    mutationFn: (taskIds: readonly string[]) =>
      reorderTasks(taskIds, classroom.data?.revisionCounters.tasks ?? -1),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['classroom'] });
    },
  });
  if (classroom.isPending || tasks.isPending) return <LoadingState />;
  if (!classroom.data || !tasks.data)
    return <Notice tone="error">Không tải được danh sách công việc.</Notice>;
  const move = (index: number, offset: -1 | 1): void => {
    const next = [...tasks.data].sort((left, right) => left.order - right.order);
    const target = index + offset;
    if (target < 0 || target >= next.length) return;
    const [moving] = next.splice(index, 1);
    if (moving) next.splice(target, 0, moving);
    reorder.mutate(next.map((task) => task.id));
  };
  const ordered = [...tasks.data].sort((left, right) => left.order - right.order);
  const visibleTasks = ordered.filter((task) =>
    statusFilter === 'ACTIVE' ? task.active : !task.active,
  );
  const activeCount = tasks.data.filter((task) => task.active).length;
  const inactiveCount = tasks.data.length - activeCount;
  const dayText = (task: TaskTemplate): string => {
    if (task.schoolDays.length === classroom.data.schoolDays.length && task.schoolDays.length > 1)
      return `${shortSchoolDayLabels[task.schoolDays[0] ?? 'MONDAY']}–${shortSchoolDayLabels[task.schoolDays.at(-1) ?? 'MONDAY']}`;
    return task.schoolDays.map((day) => shortSchoolDayLabels[day]).join(', ');
  };
  return (
    <div className="page-stack class-module-page class-tasks-page">
      {compact ? null : (
        <>
          <ClassroomTabs />
          <header className="page-heading class-tab-heading">
            <p className="eyebrow">Lớp học</p>
            <h1>Công việc trực nhật</h1>
            <p>Độ nặng chỉ dùng để chia việc cân bằng, không phải điểm thi đua.</p>
          </header>
        </>
      )}
      <section className="card class-list-card task-list-card">
        <div className="section-heading class-list-heading">
          <div>
            <h2>Danh sách công việc</h2>
            <p>Điều kiện nam hoặc nữ chỉ áp dụng khi bạn chủ động chọn.</p>
          </div>
          <div className="button-row">
            <Button
              variant="secondary"
              onClick={() => setReordering((current) => !current)}
              disabled={statusFilter !== 'ACTIVE' || visibleTasks.length < 2}
            >
              {reordering ? 'Xong sắp xếp' : 'Sắp xếp'}
            </Button>
            <Button
              onClick={() => {
                update.reset();
                setEditing('new');
              }}
            >
              <Plus size={17} />
              Thêm công việc
            </Button>
          </div>
        </div>
        <div className="segmented-filter task-status-filter" aria-label="Lọc trạng thái công việc">
          <button
            type="button"
            aria-pressed={statusFilter === 'ACTIVE'}
            onClick={() => setStatusFilter('ACTIVE')}
          >
            Đang dùng ({activeCount})
          </button>
          <button
            type="button"
            aria-pressed={statusFilter === 'INACTIVE'}
            onClick={() => setStatusFilter('INACTIVE')}
          >
            Đã tạm ngừng ({inactiveCount})
          </button>
        </div>
        {reordering ? (
          <Notice>Thứ tự này được dùng khi hiển thị lịch. Thay đổi được lưu ngay.</Notice>
        ) : null}
        {update.isError || activeMutation.isError || reorder.isError ? (
          <Notice tone="error">Không thể lưu công việc. Hãy tải lại dữ liệu và thử lại.</Notice>
        ) : null}
        <div className="entity-list task-card-grid">
          {visibleTasks.length === 0 ? (
            <div className="empty-state">
              <ClipboardList size={28} />
              <h3>Chưa có công việc</h3>
            </div>
          ) : (
            visibleTasks.map((task) => {
              const index = ordered.findIndex((item) => item.id === task.id);
              return (
                <article className="task-template-card" key={task.id}>
                  <div className="task-card-header">
                    <div className="task-card-identity">
                      <span className="task-card-icon" aria-hidden="true">
                        <ClipboardList size={21} />
                      </span>
                      <div>
                        <strong>{task.name}</strong>
                        <p>{task.requiredStudents} bạn</p>
                      </div>
                    </div>
                    <div className="icon-actions task-card-actions">
                      {reordering ? (
                        <>
                          <Button
                            variant="secondary"
                            aria-label={`Đưa ${task.name} lên`}
                            onClick={() => move(index, -1)}
                            disabled={index === 0 || reorder.isPending}
                          >
                            <ArrowUp size={17} />
                          </Button>
                          <Button
                            variant="secondary"
                            aria-label={`Đưa ${task.name} xuống`}
                            onClick={() => move(index, 1)}
                            disabled={index === ordered.length - 1 || reorder.isPending}
                          >
                            <ArrowDown size={17} />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              update.reset();
                              setEditing(task);
                            }}
                          >
                            Sửa
                          </Button>
                          <ActionMenu
                            label={`Tùy chọn cho ${task.name}`}
                            items={[
                              task.active
                                ? {
                                    label: 'Tạm ngừng',
                                    danger: true,
                                    onSelect: () => setActiveTarget(task),
                                  }
                                : {
                                    label: 'Dùng lại công việc',
                                    onSelect: () => activeMutation.mutate(task),
                                  },
                            ]}
                          />
                        </>
                      )}
                    </div>
                  </div>
                  <div className="metadata-chips task-metadata">
                    <span>{workloadLabels[task.workloadLevel]}</span>
                    <span>{dayText(task)}</span>
                    <span>{eligibilityLabels[task.eligibilityRule]}</span>
                  </div>
                  {!task.active ? <StatusBadge>Đã tạm ngừng</StatusBadge> : null}
                </article>
              );
            })
          )}
        </div>
      </section>
      <ModalDialog
        open={Boolean(editing)}
        title={editing === 'new' ? 'Thêm công việc' : editing ? `Sửa ${editing.name}` : 'Công việc'}
        description="Thiết lập số người, mức công việc, điều kiện và ngày thực hiện."
        size="wide"
        closeDisabled={update.isPending}
        onClose={() => {
          update.reset();
          setEditing(undefined);
        }}
      >
        {editing ? (
          <>
            {update.isError ? (
              <Notice tone="error">Không thể lưu công việc. Hãy kiểm tra và thử lại.</Notice>
            ) : null}
            <TaskForm
              key={editing === 'new' ? 'new' : editing.id}
              defaultSchoolDays={classroom.data.schoolDays}
              {...(editing === 'new' ? {} : { task: editing })}
              pending={update.isPending}
              onCancel={() => {
                update.reset();
                setEditing(undefined);
              }}
              onSubmit={(input) =>
                update.mutate({ input, ...(editing === 'new' ? {} : { task: editing }) })
              }
            />
          </>
        ) : null}
      </ModalDialog>
      <ConfirmDialog
        open={Boolean(activeTarget)}
        title="Tạm ngừng công việc?"
        description={`“${activeTarget?.name ?? 'Công việc này'}” sẽ không xuất hiện trong các tuần mới. Lịch sử cũ vẫn được giữ.`}
        confirmLabel="Tạm ngừng"
        onCancel={() => setActiveTarget(undefined)}
        onConfirm={() => {
          const task = activeTarget;
          setActiveTarget(undefined);
          if (task) activeMutation.mutate(task);
        }}
      />
    </div>
  );
}
