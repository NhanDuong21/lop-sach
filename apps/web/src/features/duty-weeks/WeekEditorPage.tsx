import { addDateOnlyDays, parseDateOnly, type DutyWeek } from '@lop-sach/contracts';
import { SCHEDULER_ENGINE_VERSION, generateSchedule } from '@lop-sach/scheduler';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, CalendarCheck, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { LoadingState } from '../../components/ui/LoadingState.js';
import { Notice } from '../../components/ui/Notice.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import { ApiError } from '../../lib/api-client.js';
import { getClassroom } from '../classroom/classroom.api.js';
import { DayCard } from './DayCard.js';
import {
  completeDutyWeek,
  createOneOff,
  deleteOccurrence,
  generateDutyWeek,
  getDutyWeek,
  getGenerationContext,
  patchDutyWeek,
  patchOccurrence,
  preflightDutyWeek,
  publishDutyWeek,
  replaceAbsences,
  replaceAssignment,
  setAssignmentLock,
  swapAssignments,
  writeAssignment,
} from './duty-weeks.api.js';
import { GenerationPanel } from './GenerationPanel.js';
import { PublishDialog } from './PublishDialog.js';
import { ReplacementDialog } from './ReplacementDialog.js';

type WeekOperation = () => Promise<DutyWeek>;

const statusLabels: Readonly<Record<DutyWeek['status'], string>> = {
  DRAFT: 'Bản nháp',
  PUBLISHED: 'Đã phát hành',
  COMPLETED: 'Đã hoàn thành',
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.problem.detail;
  if (error instanceof Error) return error.message;
  return 'Không thể lưu thay đổi.';
}

function CompleteWeekDialog({
  week,
  open,
  pending,
  onConfirm,
  onCancel,
}: {
  readonly week: DutyWeek;
  readonly open: boolean;
  readonly pending: boolean;
  readonly onConfirm: (
    actualPerformers: readonly { readonly slotId: string; readonly studentId: string }[],
  ) => void;
  readonly onCancel: () => void;
}): React.JSX.Element | null {
  const [actualBySlot, setActualBySlot] = useState<Readonly<Record<string, string>>>({});
  useEffect(() => {
    if (!open) return;
    setActualBySlot(
      Object.fromEntries(
        week.assignments.flatMap((assignment) =>
          assignment.studentId === null ? [] : [[assignment.slotId, assignment.studentId]],
        ),
      ),
    );
  }, [open, week]);
  if (!open) return null;
  const assigned = week.assignments.filter((assignment) => assignment.studentId !== null);
  const allSelected = assigned.every((assignment) => Boolean(actualBySlot[assignment.slotId]));
  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="confirm-dialog complete-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-title"
      >
        <h2 id="complete-title">Ghi nhận người thực hiện thực tế</h2>
        <p>
          Kiểm tra từng vị trí. Người thực hiện phải thuộc {week.groupSnapshot.name} và đủ điều kiện
          cho công việc.
        </p>
        {assigned.length === 0 ? (
          <Notice tone="warning">Tuần không có phân công để hoàn thành.</Notice>
        ) : (
          <div className="actual-performer-list">
            {assigned.map((assignment) => {
              const occurrence = week.taskOccurrences.find(
                (item) => item.id === assignment.occurrenceId,
              );
              return (
                <div className="actual-performer-row" key={assignment.slotId}>
                  <div>
                    <strong>{occurrence?.taskName ?? 'Công việc'}</strong>
                    <span>
                      {occurrence?.date} · vị trí {assignment.slotIndex + 1}
                    </span>
                  </div>
                  <label className="sr-only" htmlFor={`actual-${assignment.slotId}`}>
                    Người thực hiện {occurrence?.taskName}
                  </label>
                  <select
                    id={`actual-${assignment.slotId}`}
                    value={actualBySlot[assignment.slotId] ?? ''}
                    onChange={(event) =>
                      setActualBySlot((current) => ({
                        ...current,
                        [assignment.slotId]: event.target.value,
                      }))
                    }
                  >
                    {week.studentSnapshots
                      .filter((student) => student.active)
                      .map((student) => (
                        <option value={student.id} key={student.id}>
                          {student.displayName}
                        </option>
                      ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}
        <Notice tone="info">Sau khi hoàn thành, ledger và snapshot lịch sử sẽ bất biến.</Notice>
        <div className="button-row">
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            Hủy
          </Button>
          <Button
            disabled={pending || !allSelected || assigned.length === 0}
            onClick={() =>
              onConfirm(
                assigned.map((assignment) => ({
                  slotId: assignment.slotId,
                  studentId: actualBySlot[assignment.slotId] ?? '',
                })),
              )
            }
          >
            Hoàn thành tuần
          </Button>
        </div>
      </section>
    </div>
  );
}

export function WeekEditorPage(): React.JSX.Element {
  const { weekId = '' } = useParams();
  const queryClient = useQueryClient();
  const weekQuery = useQuery({
    queryKey: ['duty-week', weekId],
    queryFn: () => getDutyWeek(weekId),
    enabled: Boolean(weekId),
  });
  const classroom = useQuery({ queryKey: ['classroom'], queryFn: getClassroom });
  const action = useMutation({
    mutationFn: (operation: WeekOperation) => operation(),
    onSuccess: (week) => {
      queryClient.setQueryData(['duty-week', weekId], week);
      void queryClient.invalidateQueries({ queryKey: ['duty-weeks'] });
    },
  });
  const [absenceKeys, setAbsenceKeys] = useState<Set<string>>(new Set());
  const [pendingGroupId, setPendingGroupId] = useState<string | null>(null);
  const [replacementSlotId, setReplacementSlotId] = useState<string | null>(null);
  const [selectedSwapSlots, setSelectedSwapSlots] = useState<string[]>([]);
  const [publishOpen, setPublishOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [oneOffOpen, setOneOffOpen] = useState(false);
  const [oneOffDate, setOneOffDate] = useState('');
  const [oneOffName, setOneOffName] = useState('');
  const [oneOffHeadcount, setOneOffHeadcount] = useState(1);
  const [oneOffWorkload, setOneOffWorkload] = useState<1 | 2 | 3 | 4>(1);
  const week = weekQuery.data;
  useEffect(() => {
    if (!week) return;
    setAbsenceKeys(new Set(week.absences.map((absence) => `${absence.studentId}|${absence.date}`)));
    setOneOffDate(week.weekStart);
  }, [week]);
  const studentNames = useMemo(
    () => new Map(week?.studentSnapshots.map((student) => [student.id, student.displayName]) ?? []),
    [week],
  );
  if (weekQuery.isPending || classroom.isPending)
    return <LoadingState label="Đang tải tuần trực" />;
  if (!week || !classroom.data)
    return <Notice tone="error">Không tìm thấy tuần trực hoặc dữ liệu lớp.</Notice>;
  const hasLocks = week.assignments.some((assignment) => assignment.locked);
  const enabledSlotIds = week.taskOccurrences
    .filter((occurrence) => occurrence.enabled)
    .flatMap((occurrence) => occurrence.slots.map((slot) => slot.id));
  const assignedSlotIds = new Set(
    week.assignments
      .filter((assignment) => assignment.studentId !== null)
      .map((assignment) => assignment.slotId),
  );
  const complete = enabledSlotIds.every((slotId) => assignedSlotIds.has(slotId));
  const dates = [...new Set(week.taskOccurrences.map((occurrence) => occurrence.date))].sort();
  const weekDates = Array.from({ length: 7 }, (_, index) =>
    addDateOnlyDays(parseDateOnly(week.weekStart), index),
  );
  const run = (operation: WeekOperation): void => {
    action.mutate(operation);
  };
  const toggleAbsence = (studentId: string, date: string): void => {
    const key = `${studentId}|${date}`;
    setAbsenceKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const saveAbsences = (): void => {
    const absences = [...absenceKeys].map((key) => {
      const separator = key.lastIndexOf('|');
      return { studentId: key.slice(0, separator), date: parseDateOnly(key.slice(separator + 1)) };
    });
    run(() => replaceAbsences(week.id, absences, week.version));
  };
  const generate = (): void => {
    run(async () => {
      const context = await getGenerationContext(week.id);
      if (context.serverSchedulerEngineVersion !== SCHEDULER_ENGINE_VERSION) {
        throw new Error('Ứng dụng đã có phiên bản bộ xếp lịch mới. Hãy tải lại trang.');
      }
      const preview = generateSchedule(context.context);
      if (preview.inputHash !== context.inputHash)
        throw new Error('Bản xem trước không khớp dữ liệu máy chủ.');
      return generateDutyWeek(week.id, {
        expectedVersion: week.version,
        clientSchedulerEngineVersion: SCHEDULER_ENGINE_VERSION,
        inputHash: context.inputHash,
      });
    });
  };
  const toggleSwap = (slotId: string): void => {
    setSelectedSwapSlots((current) =>
      current.includes(slotId)
        ? current.filter((item) => item !== slotId)
        : current.length < 2
          ? [...current, slotId]
          : [current[1]!, slotId],
    );
  };
  const performSwap = (): void => {
    if (selectedSwapSlots.length !== 2) return;
    const [firstSlotId, secondSlotId] = selectedSwapSlots as [string, string];
    run(async () => {
      const updated = await swapAssignments(week.id, firstSlotId, secondSlotId, week.version);
      setSelectedSwapSlots([]);
      return updated;
    });
  };
  const actionError = action.error;
  const updateRequired =
    actionError instanceof ApiError && actionError.problem.code === 'SCHEDULER_VERSION_OUTDATED';
  return (
    <div className="page-stack">
      <header className="week-toolbar">
        <div>
          <p className="eyebrow">
            {classroom.data.name} · {week.groupSnapshot.name}
          </p>
          <h1>Tuần {week.weekStart}</h1>
          <div className="week-meta">
            <StatusBadge tone={week.status === 'DRAFT' ? 'warning' : 'success'}>
              {statusLabels[week.status]}
            </StatusBadge>
            <span>Revision phát hành {week.publicationRevision}</span>
          </div>
        </div>
        <div className="button-row">
          <Link className="button button-secondary" to="/">
            Về tuần này
          </Link>
          {week.status === 'DRAFT' ? (
            <Button
              disabled={
                action.isPending || week.requiresGeneration || week.generationStale || !complete
              }
              onClick={() => setPublishOpen(true)}
            >
              Phát hành
            </Button>
          ) : null}
          {week.status === 'PUBLISHED' ? (
            <Button onClick={() => setCompleteOpen(true)} disabled={action.isPending}>
              <CalendarCheck size={17} />
              Hoàn thành tuần
            </Button>
          ) : null}
        </div>
      </header>
      {week.generationStale ? (
        <Notice tone="warning">
          Dữ liệu lớp đã thay đổi sau lần tạo phân công. Hãy tạo lại hoặc kiểm tra lại trước khi
          phát hành.
        </Notice>
      ) : null}
      {actionError ? (
        <Notice tone="error">
          {errorMessage(actionError)}
          {updateRequired ? (
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Tải lại ứng dụng
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => void weekQuery.refetch()}>
              Tải lại dữ liệu
            </Button>
          )}
        </Notice>
      ) : null}
      {week.status === 'DRAFT' ? (
        <section className="card">
          <div className="section-heading">
            <div>
              <h2>Tổ trực và vắng mặt</h2>
              <p>Vắng một ngày chỉ được ghi tại tuần này.</p>
            </div>
          </div>
          {hasLocks ? (
            <Notice tone="warning">Hãy mở khóa toàn bộ phân công trước khi đổi tổ.</Notice>
          ) : null}
          <label htmlFor="week-group">Tổ trực</label>
          <select
            id="week-group"
            value={week.selectedGroupId}
            disabled={action.isPending || hasLocks}
            onChange={(event) => setPendingGroupId(event.target.value)}
          >
            {classroom.data.groups
              .filter((group) => group.active)
              .map((group) => (
                <option value={group.id} key={group.id}>
                  {group.name}
                </option>
              ))}
          </select>
          <div className="absence-table" role="group" aria-label="Vắng mặt theo ngày">
            {week.studentSnapshots.length === 0 ? (
              <Notice tone="warning">Tổ này chưa có học sinh.</Notice>
            ) : (
              week.studentSnapshots.map((student) => (
                <div className="absence-row" key={student.id}>
                  <strong>{student.displayName}</strong>
                  <div>
                    {weekDates.map((date) => {
                      const key = `${student.id}|${date}`;
                      return (
                        <label className="absence-choice" key={date}>
                          <input
                            type="checkbox"
                            checked={absenceKeys.has(key)}
                            onChange={() => toggleAbsence(student.id, date)}
                          />
                          <span>{date.slice(8)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
          <Button variant="secondary" disabled={action.isPending} onClick={saveAbsences}>
            Lưu vắng mặt
          </Button>
        </section>
      ) : null}
      <GenerationPanel
        week={week}
        pending={action.isPending}
        onGenerate={generate}
        onPreflight={() => run(() => preflightDutyWeek(week.id, week.version))}
      />
      {week.status === 'DRAFT' ? (
        <section className="card">
          <div className="section-heading">
            <div>
              <h2>Công việc phát sinh</h2>
              <p>Thêm công việc chỉ áp dụng cho tuần này.</p>
            </div>
            <Button variant="secondary" onClick={() => setOneOffOpen((current) => !current)}>
              <Plus size={17} />
              Thêm công việc
            </Button>
          </div>
          {oneOffOpen ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                run(async () => {
                  const updated = await createOneOff(week.id, {
                    date: oneOffDate,
                    taskName: oneOffName.trim(),
                    workloadLevel: oneOffWorkload,
                    eligibilityRule: 'ANY',
                    requiredStudents: oneOffHeadcount,
                    enabled: true,
                    expectedVersion: week.version,
                  });
                  setOneOffOpen(false);
                  setOneOffName('');
                  return updated;
                });
              }}
            >
              <div className="form-grid">
                <div>
                  <label htmlFor="one-off-name">Tên công việc</label>
                  <input
                    id="one-off-name"
                    value={oneOffName}
                    onChange={(event) => setOneOffName(event.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="one-off-date">Ngày</label>
                  <input
                    id="one-off-date"
                    type="date"
                    value={oneOffDate}
                    onChange={(event) => setOneOffDate(event.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="one-off-headcount">Số học sinh</label>
                  <input
                    id="one-off-headcount"
                    type="number"
                    min={1}
                    max={10}
                    value={oneOffHeadcount}
                    onChange={(event) => setOneOffHeadcount(Number(event.target.value))}
                  />
                </div>
                <div>
                  <label htmlFor="one-off-workload">Mức công việc</label>
                  <select
                    id="one-off-workload"
                    value={oneOffWorkload}
                    onChange={(event) =>
                      setOneOffWorkload(Number(event.target.value) as 1 | 2 | 3 | 4)
                    }
                  >
                    <option value={1}>1 · Nhẹ</option>
                    <option value={2}>2 · Vừa</option>
                    <option value={3}>3 · Nặng</option>
                    <option value={4}>4 · Rất nặng</option>
                  </select>
                </div>
              </div>
              <Button type="submit" disabled={action.isPending || !oneOffName.trim()}>
                Thêm vào tuần
              </Button>
            </form>
          ) : null}
        </section>
      ) : null}
      {selectedSwapSlots.length > 0 ? (
        <section className="swap-bar" aria-live="polite">
          <span>Đã chọn {selectedSwapSlots.length}/2 vị trí để hoán đổi</span>
          <div className="button-row">
            <Button variant="secondary" onClick={() => setSelectedSwapSlots([])}>
              Bỏ chọn
            </Button>
            <Button
              disabled={selectedSwapSlots.length !== 2 || action.isPending}
              onClick={performSwap}
            >
              <ArrowLeftRight size={17} />
              Hoán đổi đã chọn
            </Button>
          </div>
        </section>
      ) : null}
      <div className="week-days">
        {dates.map((date) => (
          <DayCard
            key={date}
            date={date}
            occurrences={week.taskOccurrences.filter((occurrence) => occurrence.date === date)}
            week={week}
            disabled={action.isPending}
            selectedSwapSlots={selectedSwapSlots}
            onAssign={(slotId, studentId) =>
              run(() => writeAssignment(week.id, slotId, studentId, week.version))
            }
            onLock={(slotId, locked) =>
              run(() => setAssignmentLock(week.id, slotId, locked, week.version))
            }
            onReplacement={setReplacementSlotId}
            onToggleSwap={toggleSwap}
            onToggleOccurrence={(occurrenceId, enabled) =>
              run(() =>
                patchOccurrence(week.id, occurrenceId, { enabled, expectedVersion: week.version }),
              )
            }
            onDeleteOccurrence={(occurrenceId) =>
              run(() => deleteOccurrence(week.id, occurrenceId, week.version))
            }
          />
        ))}
      </div>
      <ConfirmDialog
        open={pendingGroupId !== null}
        title="Đổi tổ trực?"
        description="Toàn bộ phân công và các đánh dấu vắng mặt không thuộc tổ mới sẽ bị xóa. Tuần sẽ chuyển sang trạng thái cần tạo lại phân công."
        confirmLabel="Đổi tổ và xóa dữ liệu cũ"
        onCancel={() => setPendingGroupId(null)}
        onConfirm={() => {
          const groupId = pendingGroupId;
          setPendingGroupId(null);
          if (groupId)
            run(() =>
              patchDutyWeek(week.id, { selectedGroupId: groupId, expectedVersion: week.version }),
            );
        }}
      />
      <PublishDialog
        week={week}
        open={publishOpen}
        pending={action.isPending}
        onCancel={() => setPublishOpen(false)}
        onConfirm={() =>
          run(async () => {
            const updated = await publishDutyWeek(week.id, week.version);
            setPublishOpen(false);
            return updated;
          })
        }
      />
      <CompleteWeekDialog
        week={week}
        open={completeOpen}
        pending={action.isPending}
        onCancel={() => setCompleteOpen(false)}
        onConfirm={(actualPerformers) =>
          run(async () => {
            const updated = await completeDutyWeek(week.id, week.version, actualPerformers);
            setCompleteOpen(false);
            return updated;
          })
        }
      />
      <ReplacementDialog
        weekId={week.id}
        slotId={replacementSlotId}
        studentNames={studentNames}
        pending={action.isPending}
        onCancel={() => setReplacementSlotId(null)}
        onSelect={(studentId) => {
          const slotId = replacementSlotId;
          if (!slotId) return;
          run(async () => {
            const updated = await replaceAssignment(week.id, slotId, studentId, week.version);
            setReplacementSlotId(null);
            return updated;
          });
        }}
      />
    </div>
  );
}
