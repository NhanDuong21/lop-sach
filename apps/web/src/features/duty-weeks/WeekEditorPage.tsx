import {
  addDateOnlyDays,
  dateOnlyWeekday,
  parseDateOnly,
  type DateOnly,
  type DutyWeek,
  type SchoolDay,
} from '@lop-sach/contracts';
import { SCHEDULER_ENGINE_VERSION, generateSchedule } from '@lop-sach/scheduler';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, CalendarCheck, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { LoadingState } from '../../components/ui/LoadingState.js';
import { ModalDialog } from '../../components/ui/ModalDialog.js';
import { Notice } from '../../components/ui/Notice.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import { ApiError } from '../../lib/api-client.js';
import { currentDateInVietnam, formatDutyDate, formatWeekRange } from '../../lib/date-labels.js';
import { schoolDayLabels } from '../../lib/vietnamese-labels.js';
import { getClassroom } from '../classroom/classroom.api.js';
import { WeekSummary } from '../current-week/WeekSummary.js';
import { DayCard } from './DayCard.js';
import {
  completeDutyWeek,
  createOneOff,
  deleteDutyWeek,
  deleteOccurrence,
  generateDutyWeek,
  getDutyWeek,
  getGenerationContext,
  getCompletionOptions,
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
import { DraftWeekTableExport } from './DraftWeekTableExport.js';
import { GenerationPanel } from './GenerationPanel.js';
import { PublishDialog } from './PublishDialog.js';
import { ReplacementDialog } from './ReplacementDialog.js';
import { WeekExportActions } from './WeekExportActions.js';

type WeekOperation = () => Promise<DutyWeek>;

const statusLabels: Readonly<Record<DutyWeek['status'], string>> = {
  DRAFT: 'Bản nháp',
  PUBLISHED: 'Đã công bố',
  COMPLETED: 'Đã hoàn thành',
};

const shortSchoolDayLabels: Readonly<Record<SchoolDay, string>> = {
  MONDAY: 'T2',
  TUESDAY: 'T3',
  WEDNESDAY: 'T4',
  THURSDAY: 'T5',
  FRIDAY: 'T6',
  SATURDAY: 'T7',
  SUNDAY: 'CN',
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
  error,
  onConfirm,
  onCancel,
}: {
  readonly week: DutyWeek;
  readonly open: boolean;
  readonly pending: boolean;
  readonly error: string | null;
  readonly onConfirm: (
    actualPerformers: readonly { readonly slotId: string; readonly studentId: string }[],
  ) => void;
  readonly onCancel: () => void;
}): React.JSX.Element | null {
  const [mode, setMode] = useState<'CHOICE' | 'CHANGES'>('CHOICE');
  const [changedSlots, setChangedSlots] = useState<ReadonlySet<string>>(new Set());
  const [actualBySlot, setActualBySlot] = useState<Readonly<Record<string, string>>>({});
  const completionOptions = useQuery({
    queryKey: ['duty-week', week.id, 'completion-options'],
    queryFn: () => getCompletionOptions(week.id),
    enabled: open && mode === 'CHANGES',
  });
  useEffect(() => {
    if (!open) return;
    setMode('CHOICE');
    setChangedSlots(new Set());
    setActualBySlot({});
  }, [open, week]);
  const occurrenceById = new Map(
    week.taskOccurrences.map((occurrence) => [occurrence.id, occurrence]),
  );
  const assigned = week.assignments
    .filter((assignment) => assignment.studentId !== null)
    .sort((left, right) => {
      const leftOccurrence = occurrenceById.get(left.occurrenceId);
      const rightOccurrence = occurrenceById.get(right.occurrenceId);
      return (
        (leftOccurrence?.date ?? '').localeCompare(rightOccurrence?.date ?? '') ||
        (leftOccurrence?.order ?? 0) - (rightOccurrence?.order ?? 0) ||
        left.slotIndex - right.slotIndex
      );
    });
  const allSelected = [...changedSlots].every((slotId) => Boolean(actualBySlot[slotId]));
  const submitChanges = (): void => {
    onConfirm(
      [...changedSlots].map((slotId) => ({
        slotId,
        studentId: actualBySlot[slotId] ?? '',
      })),
    );
  };
  return (
    <ModalDialog
      open={open}
      title="Hoàn thành tuần trực"
      size="default"
      closeDisabled={pending}
      onClose={onCancel}
    >
      {error ? <Notice tone="error">{error}</Notice> : null}
      {assigned.length === 0 ? (
        <Notice tone="warning">Tuần không có phân công để hoàn thành.</Notice>
      ) : mode === 'CHOICE' ? (
        <>
          <p>Có ai làm thay người được phân công không?</p>
          <div className="completion-choice-grid">
            <Button disabled={pending} onClick={() => onConfirm([])}>
              Không, mọi người làm đúng lịch
              <small>Giữ nguyên tất cả phân công</small>
            </Button>
            <Button variant="secondary" disabled={pending} onClick={() => setMode('CHANGES')}>
              Có người làm thay
              <small>Chọn đúng các lượt đã thay đổi</small>
            </Button>
          </div>
        </>
      ) : completionOptions.isPending ? (
        <LoadingState label="Đang tìm người thay đủ điều kiện" />
      ) : completionOptions.isError || !completionOptions.data ? (
        <Notice tone="error">Không tải được danh sách người thay phù hợp.</Notice>
      ) : (
        <div className="actual-performer-list">
          {assigned.map((assignment) => {
            const occurrence = week.taskOccurrences.find(
              (item) => item.id === assignment.occurrenceId,
            );
            const usedByOtherSlots = new Set(
              assigned
                .filter(
                  (item) =>
                    item.occurrenceId === assignment.occurrenceId &&
                    item.slotId !== assignment.slotId,
                )
                .flatMap((item) => [actualBySlot[item.slotId] ?? item.studentId ?? '']),
            );
            const eligible =
              completionOptions.data
                .find((item) => item.slotId === assignment.slotId)
                ?.students.filter(
                  (student) =>
                    student.id !== assignment.studentId && !usedByOtherSlots.has(student.id),
                ) ?? [];
            const changed = changedSlots.has(assignment.slotId);
            return (
              <div className="actual-performer-row" key={assignment.slotId}>
                <label className="completion-change-choice">
                  <input
                    type="checkbox"
                    checked={changed}
                    disabled={eligible.length === 0}
                    onChange={(event) => {
                      setChangedSlots((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(assignment.slotId);
                        else next.delete(assignment.slotId);
                        return next;
                      });
                      if (!event.target.checked) {
                        setActualBySlot((current) => {
                          const next = { ...current };
                          delete next[assignment.slotId];
                          return next;
                        });
                      }
                    }}
                  />
                  <span>
                    <strong>{occurrence?.taskName ?? 'Công việc'}</strong>
                    <small>
                      {occurrence ? formatDutyDate(occurrence.date) : ''} · đang giao cho{' '}
                      {assignment.studentDisplayName}
                    </small>
                  </span>
                </label>
                {changed ? (
                  <select
                    aria-label={`Người làm thay ${occurrence?.taskName ?? 'công việc'}`}
                    value={actualBySlot[assignment.slotId] ?? ''}
                    onChange={(event) =>
                      setActualBySlot((current) => ({
                        ...current,
                        [assignment.slotId]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Chọn người làm thay</option>
                    {eligible.map((student) => (
                      <option value={student.id} key={student.id}>
                        {student.displayName}
                      </option>
                    ))}
                  </select>
                ) : eligible.length === 0 ? (
                  <small className="muted">
                    Không có người thay nào đủ điều kiện cho lượt này.
                  </small>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      <Notice tone="info">
        Sau khi hoàn thành, kết quả thực tế và dữ liệu lịch sử sẽ không thể thay đổi.
      </Notice>
      <div className="button-row modal-actions">
        <Button
          variant="secondary"
          onClick={() => (mode === 'CHANGES' ? setMode('CHOICE') : onCancel())}
          disabled={pending}
        >
          {mode === 'CHANGES' ? 'Quay lại' : 'Hủy'}
        </Button>
        {mode === 'CHANGES' ? (
          <Button
            disabled={pending || !allSelected || changedSlots.size === 0}
            onClick={submitChanges}
          >
            Lưu thay đổi và hoàn thành
          </Button>
        ) : null}
      </div>
    </ModalDialog>
  );
}

export function WeekEditorPage(): React.JSX.Element {
  const { weekId = '' } = useParams();
  const navigate = useNavigate();
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
  const deleteDraftAction = useMutation({
    mutationFn: (input: { readonly id: string; readonly expectedVersion: number }) =>
      deleteDutyWeek(input.id, input.expectedVersion),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ['duty-week', weekId] });
      await queryClient.invalidateQueries({ queryKey: ['duty-weeks'] });
      void navigate('/');
    },
  });
  const [absenceKeys, setAbsenceKeys] = useState<Set<string>>(new Set());
  const [pendingGroupId, setPendingGroupId] = useState<string | null>(null);
  const [replacementSlotId, setReplacementSlotId] = useState<string | null>(null);
  const [selectedSwapSlots, setSelectedSwapSlots] = useState<string[]>([]);
  const [publishOpen, setPublishOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [oneOffOpen, setOneOffOpen] = useState(false);
  const [deleteOccurrenceId, setDeleteOccurrenceId] = useState<string>();
  const [deleteDraftOpen, setDeleteDraftOpen] = useState(false);
  const [oneOffDate, setOneOffDate] = useState('');
  const [oneOffName, setOneOffName] = useState('');
  const [oneOffHeadcount, setOneOffHeadcount] = useState(1);
  const [oneOffWorkload, setOneOffWorkload] = useState<1 | 2 | 3 | 4>(1);
  const [draftStep, setDraftStep] = useState<1 | 2 | 3>(1);
  const absenceScope = useRef('');
  const week = weekQuery.data;
  useEffect(() => {
    if (!week) return;
    const nextScope = `${week.id}|${week.selectedGroupId}`;
    if (absenceScope.current === nextScope) return;
    absenceScope.current = nextScope;
    setAbsenceKeys(new Set(week.absences.map((absence) => `${absence.studentId}|${absence.date}`)));
    setOneOffDate(week.weekStart);
  }, [week]);
  useEffect(() => {
    if (!week || week.status !== 'DRAFT') return;
    setDraftStep(week.generationRevision > 0 || week.assignments.length > 0 ? 2 : 1);
  }, [week?.id]);
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
  const dates = [
    ...new Set(
      week.taskOccurrences.filter((occurrence) => occurrence.enabled).map((item) => item.date),
    ),
  ].sort();
  const lastDutyDate = dates.at(-1);
  const completionAvailable = Boolean(lastDutyDate && currentDateInVietnam() >= lastDutyDate);
  const weekDates = Array.from({ length: 7 }, (_, index) =>
    addDateOnlyDays(parseDateOnly(week.weekStart), index),
  ).filter((date) => classroom.data.schoolDays.includes(dateOnlyWeekday(date)));
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
  const selectedAbsences = (): { readonly studentId: string; readonly date: DateOnly }[] =>
    [...absenceKeys].map((key) => {
      const separator = key.lastIndexOf('|');
      return { studentId: key.slice(0, separator), date: parseDateOnly(key.slice(separator + 1)) };
    });
  const generateFromVersion = async (expectedVersion: number): Promise<DutyWeek> => {
    const context = await getGenerationContext(week.id);
    if (context.serverSchedulerEngineVersion !== SCHEDULER_ENGINE_VERSION) {
      throw new Error('Ứng dụng đã có phiên bản bộ xếp lịch mới. Hãy tải lại trang.');
    }
    const preview = generateSchedule(context.context);
    if (preview.inputHash !== context.inputHash)
      throw new Error('Dữ liệu xem trước không còn khớp. Hãy tải lại và thử lại.');
    return generateDutyWeek(week.id, {
      expectedVersion,
      clientSchedulerEngineVersion: SCHEDULER_ENGINE_VERSION,
      inputHash: context.inputHash,
    });
  };
  const generate = (): void => {
    run(async () => {
      const generated = await generateFromVersion(week.version);
      setDraftStep(2);
      return generated;
    });
  };
  const prepareAndGenerate = (): void => {
    run(async () => {
      const prepared = await replaceAbsences(week.id, selectedAbsences(), week.version);
      const generated = await generateFromVersion(prepared.version);
      setDraftStep(2);
      return generated;
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
  if (week.status !== 'DRAFT') {
    return (
      <div className="page-stack published-week-view">
        <header className="week-toolbar">
          <div>
            <p className="eyebrow">
              {classroom.data.name} · {week.groupSnapshot.name}
            </p>
            <h1>Tuần {formatWeekRange(week.weekStart, dates.at(-1))}</h1>
            <div className="week-meta">
              <StatusBadge tone="success">{statusLabels[week.status]}</StatusBadge>
              {week.publicationRevision > 1 ? (
                <span>Lần cập nhật {week.publicationRevision}</span>
              ) : null}
            </div>
          </div>
          <div className="button-row">
            <Link className="button button-secondary" to="/">
              Về tuần này
            </Link>
            {week.status === 'PUBLISHED' ? (
              <Button
                onClick={() => {
                  action.reset();
                  setCompleteOpen(true);
                }}
                disabled={action.isPending || !completionAvailable}
                title={
                  completionAvailable || !lastDutyDate
                    ? undefined
                    : `Chỉ có thể hoàn thành từ ${formatDutyDate(lastDutyDate)}`
                }
              >
                <CalendarCheck size={17} aria-hidden="true" /> Hoàn thành tuần
              </Button>
            ) : null}
          </div>
        </header>
        {actionError ? (
          <Notice tone="error">
            {errorMessage(actionError)}
            <Button variant="secondary" onClick={() => void weekQuery.refetch()}>
              Tải lại dữ liệu
            </Button>
          </Notice>
        ) : null}
        {week.status === 'PUBLISHED' && lastDutyDate && !completionAvailable ? (
          <Notice tone="info">
            <strong>Chưa thể hoàn thành tuần</strong>
            <p>
              Tuần trực còn công việc vào {formatDutyDate(lastDutyDate)}. Bạn vẫn có thể lập lịch
              tuần sau; khi tới ngày này, hãy ghi người làm thay rồi hoàn thành tuần.
            </p>
          </Notice>
        ) : null}
        <section className="card published-schedule">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                {week.status === 'COMPLETED' ? 'Kết quả tuần trực' : 'Lịch đã công bố'}
              </p>
              <h2>{week.status === 'COMPLETED' ? 'Người thực tế đã làm' : 'Phân công cả tuần'}</h2>
              <p>
                {week.status === 'COMPLETED'
                  ? 'Kết quả đã được lưu cố định; trường hợp làm thay được ghi bên dưới.'
                  : 'Bạn chỉ cần đọc hoặc chia sẻ; các thao tác chỉnh sửa đã được ẩn.'}
              </p>
            </div>
          </div>
          <WeekSummary week={week} />
        </section>
        <WeekExportActions week={week} classroomName={classroom.data.name} />
        <GenerationPanel
          week={week}
          pending={action.isPending}
          onGenerate={generate}
          onPreflight={() => run(() => preflightDutyWeek(week.id, week.version))}
        />
        <div className="button-row next-week-action">
          <Link
            className={`button ${week.status === 'COMPLETED' ? 'button-primary' : 'button-secondary'}`}
            to={`/weeks/new?weekStart=${addDateOnlyDays(parseDateOnly(week.weekStart), 7)}`}
          >
            Lập lịch tuần sau
          </Link>
        </div>
        <CompleteWeekDialog
          week={week}
          open={completeOpen}
          pending={action.isPending}
          error={actionError ? errorMessage(actionError) : null}
          onCancel={() => {
            action.reset();
            setCompleteOpen(false);
          }}
          onConfirm={(actualPerformers) =>
            run(async () => {
              const updated = await completeDutyWeek(week.id, week.version, actualPerformers);
              setCompleteOpen(false);
              return updated;
            })
          }
        />
      </div>
    );
  }
  return (
    <div className="page-stack">
      <header className="week-toolbar">
        <div>
          <p className="eyebrow">
            {classroom.data.name} · {week.groupSnapshot.name}
          </p>
          <h1>Tuần {formatWeekRange(week.weekStart, dates.at(-1))}</h1>
          <div className="week-meta">
            <StatusBadge tone={week.status === 'DRAFT' ? 'warning' : 'success'}>
              {statusLabels[week.status]}
            </StatusBadge>
          </div>
        </div>
        <div className="button-row">
          <Link className="button button-secondary" to="/">
            Về tuần này
          </Link>
          <Button
            variant="danger"
            onClick={() => {
              deleteDraftAction.reset();
              setDeleteDraftOpen(true);
            }}
          >
            Xóa bản nháp
          </Button>
        </div>
      </header>
      <ol className="workflow-steps" aria-label="Các bước lập lịch tuần">
        {[
          { step: 1 as const, label: 'Chuẩn bị' },
          { step: 2 as const, label: 'Kiểm tra phân công' },
          { step: 3 as const, label: 'Công bố' },
        ].map((item) => (
          <li
            className={
              draftStep === item.step ? 'active' : draftStep > item.step ? 'complete' : undefined
            }
            key={item.step}
          >
            <button
              type="button"
              disabled={
                (item.step > 1 && week.generationRevision === 0) ||
                (item.step === 3 && (week.requiresGeneration || week.generationStale || !complete))
              }
              onClick={() => setDraftStep(item.step)}
            >
              <span>{item.step}</span>
              {item.label}
            </button>
          </li>
        ))}
      </ol>
      {week.generationStale && week.assignments.length > 0 ? (
        <Notice tone="warning">
          Dữ liệu lớp đã thay đổi sau lần tạo phân công. Hãy tạo lại hoặc kiểm tra lại trước khi
          công bố.
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
      {draftStep === 1 ? (
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
                            aria-label={`${student.displayName} vắng ${schoolDayLabels[dateOnlyWeekday(date)]}, ngày ${date.slice(8)}/${date.slice(5, 7)}`}
                            checked={absenceKeys.has(key)}
                            onChange={() => toggleAbsence(student.id, date)}
                          />
                          <span>
                            {shortSchoolDayLabels[dateOnlyWeekday(date)]} {date.slice(8)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="inline-summary">
            <div>
              <strong>Công việc tuần này</strong>
              <span>
                {week.taskOccurrences.filter((occurrence) => occurrence.enabled).length} công việc
                đang dùng
              </span>
            </div>
            <Button variant="secondary" onClick={() => setOneOffOpen(true)}>
              <Plus size={17} aria-hidden="true" /> Thêm việc phát sinh
            </Button>
          </div>
          <div className="wizard-actions sticky-mobile-actions">
            <span className="muted">Vắng mặt sẽ được lưu cùng lúc khi tạo phân công.</span>
            <Button
              disabled={action.isPending || week.studentSnapshots.length === 0}
              onClick={prepareAndGenerate}
            >
              Tiếp tục tạo phân công
            </Button>
          </div>
        </section>
      ) : null}
      {draftStep === 2 ? (
        <>
          <DraftWeekTableExport week={week} classroomName={classroom.data.name} />
          <GenerationPanel
            week={week}
            pending={action.isPending}
            onGenerate={generate}
            onPreflight={() => run(() => preflightDutyWeek(week.id, week.version))}
          />
        </>
      ) : null}
      <ModalDialog
        open={oneOffOpen}
        title="Thêm công việc phát sinh"
        description="Công việc này chỉ áp dụng cho tuần đang chỉnh sửa."
        closeDisabled={action.isPending}
        onClose={() => setOneOffOpen(false)}
      >
        <form
          className="editor-form"
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
              <label htmlFor="one-off-headcount">Số bạn cần</label>
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
              <label htmlFor="one-off-workload">Độ nặng</label>
              <select
                id="one-off-workload"
                value={oneOffWorkload}
                onChange={(event) => setOneOffWorkload(Number(event.target.value) as 1 | 2 | 3 | 4)}
              >
                <option value={1}>Nhẹ</option>
                <option value={2}>Vừa</option>
                <option value={3}>Nặng</option>
                <option value={4}>Rất nặng</option>
              </select>
            </div>
          </div>
          <div className="button-row modal-actions">
            <Button variant="secondary" onClick={() => setOneOffOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={action.isPending || !oneOffName.trim()}>
              Thêm vào tuần
            </Button>
          </div>
        </form>
      </ModalDialog>
      {draftStep === 2 && selectedSwapSlots.length > 0 ? (
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
      {draftStep === 2 ? (
        <>
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
                    patchOccurrence(week.id, occurrenceId, {
                      enabled,
                      expectedVersion: week.version,
                    }),
                  )
                }
                onDeleteOccurrence={setDeleteOccurrenceId}
              />
            ))}
          </div>
          <div className="wizard-actions sticky-mobile-actions">
            <Button variant="secondary" onClick={() => setDraftStep(1)}>
              Quay lại chuẩn bị
            </Button>
            <Button
              disabled={
                action.isPending || week.requiresGeneration || week.generationStale || !complete
              }
              onClick={() => setDraftStep(3)}
            >
              Tiếp tục công bố
            </Button>
          </div>
        </>
      ) : null}
      {draftStep === 3 ? (
        <section className="card publish-review">
          <div className="review-card">
            <p className="eyebrow">Sẵn sàng công bố</p>
            <h2>{week.groupSnapshot.name}</h2>
            <p>Tuần {formatWeekRange(week.weekStart, dates.at(-1))}</p>
            <dl>
              <div>
                <dt>Người đã được phân công</dt>
                <dd>
                  {assignedSlotIds.size}/{enabledSlotIds.length}
                </dd>
              </div>
              <div>
                <dt>Mức độ cân bằng</dt>
                <dd>{week.fairness?.label ?? 'Chưa đánh giá'}</dd>
              </div>
              <div>
                <dt>Lưu ý đã xem</dt>
                <dd>{week.warnings.length}</dd>
              </div>
            </dl>
          </div>
          <details className="publish-preview">
            <summary>Xem trước lịch gửi lớp</summary>
            <WeekSummary week={week} />
          </details>
          <div className="wizard-actions sticky-mobile-actions">
            <Button variant="secondary" onClick={() => setDraftStep(2)}>
              Quay lại chỉnh sửa
            </Button>
            <Button
              disabled={
                action.isPending || week.requiresGeneration || week.generationStale || !complete
              }
              onClick={() => setPublishOpen(true)}
            >
              Công bố lịch
            </Button>
          </div>
        </section>
      ) : null}
      <ConfirmDialog
        open={deleteDraftOpen}
        title="Xóa bản nháp?"
        description={`Lịch nháp tuần ${formatWeekRange(week.weekStart, dates.at(-1))}, các đánh dấu vắng mặt, công việc phát sinh và phân công chưa công bố sẽ bị xóa vĩnh viễn. Bạn có thể tạo lại tuần này sau đó.`}
        confirmLabel="Xóa bản nháp"
        pending={deleteDraftAction.isPending}
        pendingLabel="Đang xóa…"
        error={deleteDraftAction.isError ? errorMessage(deleteDraftAction.error) : null}
        onCancel={() => {
          if (!deleteDraftAction.isPending) setDeleteDraftOpen(false);
        }}
        onConfirm={() => deleteDraftAction.mutate({ id: week.id, expectedVersion: week.version })}
      />
      <ConfirmDialog
        open={Boolean(deleteOccurrenceId)}
        title="Xóa công việc phát sinh?"
        description={`Công việc “${week.taskOccurrences.find((item) => item.id === deleteOccurrenceId)?.taskName ?? 'đã chọn'}” và các phân công của công việc này sẽ bị xóa khỏi tuần.`}
        confirmLabel="Xóa công việc"
        onCancel={() => setDeleteOccurrenceId(undefined)}
        onConfirm={() => {
          const occurrenceId = deleteOccurrenceId;
          setDeleteOccurrenceId(undefined);
          if (occurrenceId) run(() => deleteOccurrence(week.id, occurrenceId, week.version));
        }}
      />
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
        error={actionError ? errorMessage(actionError) : null}
        onCancel={() => {
          action.reset();
          setCompleteOpen(false);
        }}
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
