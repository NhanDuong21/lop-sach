import type { TaskTemplate } from '@lop-sach/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ClipboardList, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/Button.js';
import { LoadingState } from '../../components/ui/LoadingState.js';
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

export function TaskTemplatesPage({
  compact = false,
}: {
  readonly compact?: boolean;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const classroom = useQuery({ queryKey: ['classroom'], queryFn: getClassroom });
  const tasks = useQuery({ queryKey: ['tasks'], queryFn: listTasks });
  const [editing, setEditing] = useState<TaskTemplate | 'new'>();
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
    const next = [...tasks.data];
    const target = index + offset;
    if (target < 0 || target >= next.length) return;
    const [moving] = next.splice(index, 1);
    if (moving) next.splice(target, 0, moving);
    reorder.mutate(next.map((task) => task.id));
  };
  return (
    <div className="page-stack">
      {compact ? null : (
        <header className="page-heading">
          <p className="eyebrow">Thiết lập</p>
          <h1>Công việc trực nhật</h1>
          <p>Khối lượng và số người giúp hệ thống xếp lịch cân bằng.</p>
        </header>
      )}
      <section className="card">
        <div className="section-heading">
          <div>
            <h2>Danh sách công việc</h2>
            <p>Điều kiện nam hoặc nữ chỉ áp dụng khi bạn chủ động chọn.</p>
          </div>
          <Button onClick={() => setEditing('new')}>
            <Plus size={17} />
            Thêm công việc
          </Button>
        </div>
        {update.isError || activeMutation.isError || reorder.isError ? (
          <Notice tone="error">Không thể lưu công việc. Hãy tải lại dữ liệu và thử lại.</Notice>
        ) : null}
        <div className="entity-list">
          {tasks.data.length === 0 ? (
            <div className="empty-state">
              <ClipboardList size={28} />
              <h3>Chưa có công việc</h3>
            </div>
          ) : (
            tasks.data.map((task, index) => (
              <article className="entity-row" key={task.id}>
                <div>
                  <strong>{task.name}</strong>
                  <p>
                    {task.requiredStudents} người · {workloadLabels[task.workloadLevel]} ·{' '}
                    {task.schoolDays.length} ngày/tuần · {eligibilityLabels[task.eligibilityRule]}
                  </p>
                </div>
                <StatusBadge tone={task.active ? 'success' : 'neutral'}>
                  {task.active ? 'Đang áp dụng' : 'Ngừng áp dụng'}
                </StatusBadge>
                <div className="icon-actions">
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
                    disabled={index === tasks.data.length - 1 || reorder.isPending}
                  >
                    <ArrowDown size={17} />
                  </Button>
                  <Button variant="secondary" onClick={() => setEditing(task)}>
                    Sửa
                  </Button>
                  <Button variant="secondary" onClick={() => activeMutation.mutate(task)}>
                    {task.active ? 'Ngừng áp dụng' : 'Áp dụng lại'}
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
      {editing ? (
        <section className="card">
          <h2>{editing === 'new' ? 'Thêm công việc' : `Sửa ${editing.name}`}</h2>
          <TaskForm
            key={editing === 'new' ? 'new' : editing.id}
            defaultSchoolDays={classroom.data.schoolDays}
            {...(editing === 'new' ? {} : { task: editing })}
            pending={update.isPending}
            onCancel={() => setEditing(undefined)}
            onSubmit={(input) =>
              update.mutate({ input, ...(editing === 'new' ? {} : { task: editing }) })
            }
          />
        </section>
      ) : null}
    </div>
  );
}
