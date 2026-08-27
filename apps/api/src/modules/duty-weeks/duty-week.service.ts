import {
  DateOnlySchema,
  TaskOccurrenceSchema,
  addDateOnlyDays,
  dateOnlyWeekday,
  weekDates,
  type DutyGroupSelectionBasis,
  type DutyWeek,
  type HistoryMetric,
  type HistorySummaryItem,
  type TaskEligibilityRule,
  type WorkloadLevel,
  WorkloadLevelSchema,
} from '@lop-sach/contracts';
import {
  SCHEDULER_ENGINE_VERSION,
  applyReplacement,
  assertSchedulerVersion,
  calculateFairnessResult,
  explainReasonCodes,
  generateSchedule,
  isStudentEligible,
  suggestReplacements,
  validateAssignments,
  type GeneratedAssignment,
  type SchedulerContext,
} from '@lop-sach/scheduler';
import mongoose, { type ClientSession, type HydratedDocument } from 'mongoose';
import { createId } from '../../shared/ids.js';
import { HttpProblem } from '../../shared/problem.js';
import { ClassroomModel, type ClassroomDocument } from '../classroom/classroom.model.js';
import { StudentModel, type StudentDocument } from '../students/student.model.js';
import { mapStudentRestrictions } from '../students/student-restrictions.js';
import {
  TaskTemplateModel,
  type TaskTemplateDocument,
} from '../task-templates/task-template.model.js';
import { appendDutyWeekChange, emptyChangeLogSummary } from './change-history.js';
import { assertDutyWeekShapeLimits, assertDutyWeekSize } from './document-size.js';
import { mapDutyWeek, type DutyWeekHydrated } from './duty-week.mapper.js';
import { DutyWeekModel } from './duty-week.model.js';
import {
  buildGenerationContext,
  generationContextIsStale,
  type BuiltGenerationContext,
} from './generation-context.js';

const { Types } = mongoose;
type ClassroomHydrated = HydratedDocument<ClassroomDocument> & { version: number };
type StudentHydrated = HydratedDocument<StudentDocument> & { version: number };
type TaskHydrated = HydratedDocument<TaskTemplateDocument> & { version: number };
type DutyOccurrence = DutyWeek['taskOccurrences'][number];
type DutyAssignment = DutyWeek['assignments'][number];

interface CreateWeekInput {
  readonly weekStart: string;
  readonly selectedGroupId: string;
  readonly selectionBasis: DutyGroupSelectionBasis;
  readonly selectionNote: string;
}

interface PatchWeekInput {
  readonly selectedGroupId?: string | undefined;
  readonly selectionBasis?: DutyGroupSelectionBasis | undefined;
  readonly selectionNote?: string | undefined;
  readonly expectedVersion: number;
}

interface OccurrenceWriteInput {
  readonly date?: string | undefined;
  readonly taskName?: string | undefined;
  readonly workloadLevel?: WorkloadLevel | undefined;
  readonly eligibilityRule?: TaskEligibilityRule | undefined;
  readonly requiredStudents?: number | undefined;
  readonly enabled?: boolean | undefined;
  readonly expectedVersion: number;
}

function ownerObjectId(ownerId: string): mongoose.Types.ObjectId {
  return new Types.ObjectId(ownerId);
}

function weekObjectId(weekId: string): mongoose.Types.ObjectId {
  if (!Types.ObjectId.isValid(weekId)) {
    throw new HttpProblem(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy tuần trực.');
  }
  return new Types.ObjectId(weekId);
}

async function ownerClassroom(
  ownerId: string,
  session?: ClientSession,
): Promise<ClassroomHydrated> {
  const query = ClassroomModel.findOne({ ownerId: ownerObjectId(ownerId) });
  if (session) query.session(session);
  const classroom = await query;
  if (!classroom) throw new HttpProblem(404, 'RESOURCE_NOT_FOUND', 'Chưa có lớp học.');
  return classroom as ClassroomHydrated;
}

async function findWeek(ownerId: string, weekId: string): Promise<DutyWeekHydrated> {
  const week = await DutyWeekModel.findOne({
    _id: weekObjectId(weekId),
    ownerId: ownerObjectId(ownerId),
  });
  if (!week) throw new HttpProblem(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy tuần trực.');
  return week as DutyWeekHydrated;
}

function assertVersion(week: DutyWeekHydrated, expectedVersion: number): void {
  if (week.version !== expectedVersion) {
    throw new HttpProblem(409, 'VERSION_CONFLICT', 'Tuần trực đã thay đổi. Hãy tải lại.');
  }
}

function assertDraft(week: DutyWeekHydrated): void {
  if (week.status !== 'DRAFT') {
    throw new HttpProblem(
      409,
      'INVALID_WEEK_TRANSITION',
      'Chỉ tuần nháp mới được chỉnh sửa hoặc tạo lại.',
    );
  }
}

function assertPublished(week: DutyWeekHydrated): void {
  if (week.status !== 'PUBLISHED') {
    throw new HttpProblem(
      409,
      'INVALID_WEEK_TRANSITION',
      'Chỉ tuần đã phát hành mới được hoàn thành.',
    );
  }
}

function selectedGroup(
  classroom: ClassroomHydrated,
  groupId: string,
): { readonly id: string; readonly name: string } {
  const group = classroom.groups.find((candidate) => candidate.id === groupId && candidate.active);
  if (!group)
    throw new HttpProblem(
      422,
      'VALIDATION_FAILED',
      'Tổ trực không tồn tại hoặc đã ngừng hoạt động.',
    );
  return { id: String(group.id), name: String(group.name) };
}

async function studentSnapshots(
  classroomId: mongoose.Types.ObjectId,
  groupId: string,
  groupName: string,
  session?: ClientSession,
): Promise<DutyWeek['studentSnapshots']> {
  const query = StudentModel.find({ classroomId, groupId }).sort({ displayName: 1, _id: 1 });
  if (session) query.session(session);
  const students = await query;
  return students.map((rawStudent) => {
    const student = rawStudent as StudentHydrated;
    return {
      id: String(student._id),
      displayName: student.displayName,
      groupId: student.groupId,
      groupName,
      active: student.active,
      gender: student.gender,
      participationStart: DateOnlySchema.nullable().parse(student.participationStart),
      participationEnd: DateOnlySchema.nullable().parse(student.participationEnd),
      restrictions: mapStudentRestrictions(student.restrictions),
      revision: student.version,
    };
  });
}

function slotsFor(occurrenceId: string, count: number): DutyOccurrence['slots'] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${occurrenceId}:${String(index)}`,
    index,
  }));
}

async function recurringOccurrences(
  classroomId: mongoose.Types.ObjectId,
  weekStart: string,
  session?: ClientSession,
): Promise<DutyOccurrence[]> {
  const query = TaskTemplateModel.find({ classroomId, active: true }).sort({ order: 1, _id: 1 });
  if (session) query.session(session);
  const tasks = (await query) as TaskHydrated[];
  const dates = weekDates(DateOnlySchema.parse(weekStart));
  const occurrences: DutyOccurrence[] = [];
  for (const date of dates) {
    const weekday = dateOnlyWeekday(date);
    for (const task of tasks) {
      if (!task.schoolDays.includes(weekday)) continue;
      const id = createId();
      occurrences.push({
        id,
        date,
        source: 'RECURRING',
        taskTemplateId: String(task._id),
        taskTemplateRevision: task.version,
        taskFingerprint: `template:${String(task._id)}`,
        taskName: task.name,
        workloadLevel: WorkloadLevelSchema.parse(task.workloadLevel),
        eligibilityRule: task.eligibilityRule,
        requiredStudents: task.requiredStudents,
        enabled: true,
        order: task.order,
        slots: slotsFor(id, task.requiredStudents),
      });
    }
  }
  assertDutyWeekShapeLimits({ taskOccurrences: occurrences });
  return occurrences;
}

function invalidateGeneration(week: DutyWeekHydrated, incrementConfiguration = true): void {
  if (incrementConfiguration) week.configurationRevision += 1;
  week.requiresGeneration = true;
  week.generationContextHash = null;
  week.generationDataRevisions = null;
  week.generationValidationSource = null;
  week.warnings = [];
  week.relaxedRules = [];
  week.fairness = null;
}

async function saveWeek(week: DutyWeekHydrated, stale: boolean): Promise<DutyWeek> {
  for (const path of [
    'groupSnapshot',
    'studentSnapshots',
    'taskOccurrences',
    'absences',
    'assignments',
    'warnings',
    'fairness',
    'fairnessBaseline',
    'completionLedger',
    'generationDataRevisions',
    'changeLog',
    'changeLogSummary',
  ]) {
    week.markModified(path);
  }
  assertDutyWeekShapeLimits({ taskOccurrences: week.taskOccurrences });
  assertDutyWeekSize(week.toObject({ depopulate: true }));
  await week.save();
  return mapDutyWeek(week, stale);
}

function schedulerAssignments(week: DutyWeekHydrated): readonly GeneratedAssignment[] {
  return week.assignments.flatMap((assignment) =>
    assignment.studentId === null
      ? []
      : [
          {
            slotId: assignment.slotId,
            occurrenceId: assignment.occurrenceId,
            studentId: assignment.studentId,
            source: assignment.source === 'AUTO' ? ('AUTO' as const) : ('MANUAL' as const),
            locked: assignment.locked,
            reasonCodes: assignment.reasonCodes,
          },
        ],
  );
}

function assignmentFromGenerated(
  generated: GeneratedAssignment,
  week: DutyWeekHydrated,
): DutyAssignment {
  const occurrence = week.taskOccurrences.find((item) => item.id === generated.occurrenceId);
  const slot = occurrence?.slots.find((item) => item.id === generated.slotId);
  const student = week.studentSnapshots.find((item) => item.id === generated.studentId);
  const previous = week.assignments.find(
    (item) => item.slotId === generated.slotId && item.studentId === generated.studentId,
  );
  if (!occurrence || !slot || !student)
    throw new Error('Generated assignment references an unknown snapshot.');
  return {
    slotId: generated.slotId,
    occurrenceId: generated.occurrenceId,
    slotIndex: slot.index,
    studentId: generated.studentId,
    studentDisplayName: student.displayName,
    source: previous?.source ?? generated.source,
    locked: generated.locked,
    reasonCodes: [...generated.reasonCodes],
    explanation: [...explainReasonCodes(generated.reasonCodes)],
    actualStudentId: null,
    actualStudentDisplayName: null,
  };
}

function assertCompleteHardValid(week: DutyWeekHydrated, context: SchedulerContext): void {
  const assignments = schedulerAssignments(week);
  const violations = [...validateAssignments(context, assignments)];
  const assignedSlots = new Set(assignments.map((assignment) => assignment.slotId));
  const missingSlots = context.input.occurrences
    .filter((occurrence) => occurrence.enabled)
    .flatMap((occurrence) => occurrence.slots)
    .filter((slot) => !assignedSlots.has(slot.id));
  if (violations.length > 0 || missingSlots.length > 0) {
    throw new HttpProblem(
      409,
      'HARD_CONSTRAINT_VIOLATION',
      'Phân công hiện tại chưa đáp ứng đầy đủ các điều kiện bắt buộc.',
    );
  }
}

export async function listDutyWeeks(
  ownerId: string,
  filters: {
    readonly status?: string | undefined;
    readonly from?: string | undefined;
    readonly to?: string | undefined;
  },
): Promise<readonly DutyWeek[]> {
  const classroom = await ownerClassroom(ownerId);
  const query: Record<string, unknown> = { classroomId: classroom._id };
  if (filters.status !== undefined) query.status = filters.status;
  if (filters.from !== undefined || filters.to !== undefined) {
    query.weekStart = {
      ...(filters.from === undefined ? {} : { $gte: filters.from }),
      ...(filters.to === undefined ? {} : { $lte: filters.to }),
    };
  }
  const weeks = await DutyWeekModel.find(query).sort({ weekStart: -1, _id: -1 });
  return Promise.all(
    weeks.map(async (week) => {
      const hydrated = week as DutyWeekHydrated;
      return mapDutyWeek(hydrated, await generationContextIsStale(hydrated));
    }),
  );
}

export async function getDutyWeek(ownerId: string, weekId: string): Promise<DutyWeek> {
  const week = await findWeek(ownerId, weekId);
  return mapDutyWeek(week, await generationContextIsStale(week));
}

export async function listHistorySummary(ownerId: string): Promise<readonly HistorySummaryItem[]> {
  const classroom = await ownerClassroom(ownerId);
  const weeks = await DutyWeekModel.find({ classroomId: classroom._id, status: 'COMPLETED' }).sort({
    weekStart: -1,
    _id: -1,
  });
  return weeks.map((rawWeek) => {
    const week = rawWeek as DutyWeekHydrated;
    return {
      id: String(week._id),
      weekStart: DateOnlySchema.parse(week.weekStart),
      groupName: week.groupSnapshot.name,
      status: 'COMPLETED' as const,
      publicationRevision: week.publicationRevision,
      fairness: week.fairness,
      warningCount: week.warnings.length,
      actualPoints: week.completionLedger.reduce((total, entry) => total + entry.actualPoints, 0),
      usedAssignedPerformerFallback: week.completionLedger.some(
        (entry) => entry.usedAssignedPerformerFallback,
      ),
    };
  });
}

export async function historyMetrics(ownerId: string): Promise<readonly HistoryMetric[]> {
  const classroom = await ownerClassroom(ownerId);
  const weeks = await DutyWeekModel.find({ classroomId: classroom._id, status: 'COMPLETED' }).sort({
    weekStart: 1,
    _id: 1,
  });
  const metrics = new Map<string, HistoryMetric>();
  for (const rawWeek of weeks) {
    const week = rawWeek as DutyWeekHydrated;
    const names = new Map(
      week.studentSnapshots.map((student) => [student.id, student.displayName]),
    );
    for (const entry of week.completionLedger) {
      const previous = metrics.get(entry.studentId);
      metrics.set(entry.studentId, {
        studentId: entry.studentId,
        studentDisplayName:
          names.get(entry.studentId) ?? previous?.studentDisplayName ?? 'Học sinh trong snapshot',
        actualPoints: (previous?.actualPoints ?? 0) + entry.actualPoints,
        opportunityPoints: (previous?.opportunityPoints ?? 0) + entry.opportunityPoints,
        dutyCount:
          (previous?.dutyCount ?? 0) + entry.tasks.reduce((total, task) => total + task.count, 0),
        completedWeekCount: (previous?.completedWeekCount ?? 0) + 1,
      });
    }
  }
  return [...metrics.values()].sort(
    (left, right) =>
      right.actualPoints - left.actualPoints ||
      left.studentDisplayName.localeCompare(right.studentDisplayName, 'vi'),
  );
}

export async function createDutyWeek(ownerId: string, input: CreateWeekInput): Promise<DutyWeek> {
  const classroom = await ownerClassroom(ownerId);
  if (await DutyWeekModel.exists({ classroomId: classroom._id, weekStart: input.weekStart })) {
    throw new HttpProblem(409, 'WEEK_ALREADY_EXISTS', 'Tuần trực này đã tồn tại.');
  }
  const group = selectedGroup(classroom, input.selectedGroupId);
  const snapshots = await studentSnapshots(classroom._id, group.id, group.name);
  const occurrences = await recurringOccurrences(classroom._id, input.weekStart);
  const now = new Date().toISOString();
  const [created] = await DutyWeekModel.create(
    [
      {
        ownerId: ownerObjectId(ownerId),
        classroomId: classroom._id,
        weekStart: input.weekStart,
        status: 'DRAFT',
        selectedGroupId: group.id,
        selectionBasis: input.selectionBasis,
        selectionNote: input.selectionNote,
        groupSnapshot: group,
        studentSnapshots: snapshots,
        taskOccurrences: occurrences,
        absences: [],
        assignments: [],
        warnings: [],
        relaxedRules: [],
        fairness: null,
        fairnessBaseline: [],
        completionLedger: [],
        schedulerEngineVersion: SCHEDULER_ENGINE_VERSION,
        generationRevision: 0,
        generationContextHash: null,
        generationDataRevisions: null,
        generationValidationSource: null,
        configurationRevision: 1,
        requiresGeneration: true,
        publicationRevision: 0,
        changeLog: [{ id: createId(), at: now, action: 'WEEK_CREATED', actorUserId: ownerId }],
        changeLogSummary: emptyChangeLogSummary(),
      },
    ],
    { ordered: true },
  );
  if (!created) throw new Error('Không tạo được tuần trực.');
  const week = created as DutyWeekHydrated;
  assertDutyWeekSize(week.toObject({ depopulate: true }));
  return mapDutyWeek(week, true);
}

export async function patchDutyWeek(
  ownerId: string,
  weekId: string,
  input: PatchWeekInput,
): Promise<DutyWeek> {
  const week = await findWeek(ownerId, weekId);
  assertDraft(week);
  assertVersion(week, input.expectedVersion);
  let generationStale = await generationContextIsStale(week);
  if (input.selectedGroupId !== undefined && input.selectedGroupId !== week.selectedGroupId) {
    if (week.assignments.some((assignment) => assignment.locked)) {
      throw new HttpProblem(
        409,
        'LOCKED_ASSIGNMENTS_BLOCK_GROUP_CHANGE',
        'Hãy mở khóa toàn bộ phân công trước khi đổi tổ trực.',
      );
    }
    const classroom = await ownerClassroom(ownerId);
    const group = selectedGroup(classroom, input.selectedGroupId);
    const snapshots = await studentSnapshots(classroom._id, group.id, group.name);
    const allowedStudentIds = new Set(snapshots.map((student) => student.id));
    week.selectedGroupId = group.id;
    week.groupSnapshot = group;
    week.studentSnapshots = snapshots;
    week.assignments = [];
    week.absences = week.absences.filter((absence) => allowedStudentIds.has(absence.studentId));
    week.fairnessBaseline = [];
    invalidateGeneration(week, true);
    generationStale = true;
    appendDutyWeekChange(week, ownerId, 'SELECTED_GROUP_CHANGED');
  }
  if (input.selectionBasis !== undefined) week.selectionBasis = input.selectionBasis;
  if (input.selectionNote !== undefined) week.selectionNote = input.selectionNote;
  appendDutyWeekChange(week, ownerId, 'WEEK_DETAILS_UPDATED');
  return saveWeek(week, generationStale);
}

export async function replaceAbsences(
  ownerId: string,
  weekId: string,
  absences: DutyWeek['absences'],
  expectedVersion: number,
): Promise<DutyWeek> {
  const week = await findWeek(ownerId, weekId);
  assertDraft(week);
  assertVersion(week, expectedVersion);
  const studentIds = new Set(week.studentSnapshots.map((student) => student.id));
  const validDates = new Set(weekDates(DateOnlySchema.parse(week.weekStart)));
  const seen = new Set<string>();
  for (const absence of absences) {
    const key = `${absence.studentId}|${absence.date}`;
    if (!studentIds.has(absence.studentId) || !validDates.has(absence.date) || seen.has(key)) {
      throw new HttpProblem(
        422,
        'VALIDATION_FAILED',
        'Danh sách vắng mặt không hợp lệ hoặc bị trùng.',
      );
    }
    seen.add(key);
  }
  week.absences = [...absences].sort(
    (left, right) =>
      left.date.localeCompare(right.date) || left.studentId.localeCompare(right.studentId),
  );
  invalidateGeneration(week, true);
  appendDutyWeekChange(week, ownerId, 'ABSENCES_REPLACED');
  return saveWeek(week, true);
}

function assertDateInsideWeek(week: DutyWeekHydrated, date: string): void {
  const lastDate = addDateOnlyDays(DateOnlySchema.parse(week.weekStart), 6);
  if (date < week.weekStart || date > lastDate) {
    throw new HttpProblem(422, 'VALIDATION_FAILED', 'Ngày công việc phải nằm trong tuần trực.');
  }
}

export async function createTaskOccurrence(
  ownerId: string,
  weekId: string,
  input: {
    readonly date: string;
    readonly taskName: string;
    readonly workloadLevel: WorkloadLevel;
    readonly eligibilityRule: TaskEligibilityRule;
    readonly requiredStudents: number;
    readonly enabled: boolean;
    readonly expectedVersion: number;
  },
): Promise<DutyWeek> {
  const week = await findWeek(ownerId, weekId);
  assertDraft(week);
  assertVersion(week, input.expectedVersion);
  assertDateInsideWeek(week, input.date);
  const id = createId();
  week.taskOccurrences = [
    ...week.taskOccurrences,
    TaskOccurrenceSchema.parse({
      id,
      date: input.date,
      source: 'ONE_OFF',
      taskTemplateId: null,
      taskTemplateRevision: null,
      taskFingerprint: `one-off:${id}`,
      taskName: input.taskName,
      workloadLevel: input.workloadLevel,
      eligibilityRule: input.eligibilityRule,
      requiredStudents: input.requiredStudents,
      enabled: input.enabled,
      order: Math.max(-1, ...week.taskOccurrences.map((occurrence) => occurrence.order)) + 1,
      slots: slotsFor(id, input.requiredStudents),
    }),
  ];
  invalidateGeneration(week, true);
  appendDutyWeekChange(week, ownerId, 'TASK_OCCURRENCE_CREATED');
  return saveWeek(week, true);
}

export async function patchTaskOccurrence(
  ownerId: string,
  weekId: string,
  occurrenceId: string,
  input: OccurrenceWriteInput,
): Promise<DutyWeek> {
  const week = await findWeek(ownerId, weekId);
  assertDraft(week);
  assertVersion(week, input.expectedVersion);
  const occurrence = week.taskOccurrences.find((item) => item.id === occurrenceId);
  if (!occurrence)
    throw new HttpProblem(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy công việc trong tuần.');
  if (input.date !== undefined) assertDateInsideWeek(week, input.date);
  const nextHeadcount = input.requiredStudents ?? occurrence.requiredStudents;
  if (nextHeadcount < occurrence.requiredStudents) {
    const removedSlotIds = new Set(occurrence.slots.slice(nextHeadcount).map((slot) => slot.id));
    if (
      week.assignments.some(
        (assignment) => removedSlotIds.has(assignment.slotId) && assignment.locked,
      )
    ) {
      throw new HttpProblem(
        409,
        'INVALID_LOCKED_ASSIGNMENT',
        'Không thể xóa vị trí phân công đang khóa.',
      );
    }
    week.assignments = week.assignments.filter(
      (assignment) => !removedSlotIds.has(assignment.slotId),
    );
  }
  const replacement = TaskOccurrenceSchema.parse({
    ...occurrence,
    ...(input.date === undefined ? {} : { date: input.date }),
    ...(input.taskName === undefined ? {} : { taskName: input.taskName }),
    ...(input.workloadLevel === undefined ? {} : { workloadLevel: input.workloadLevel }),
    ...(input.eligibilityRule === undefined ? {} : { eligibilityRule: input.eligibilityRule }),
    ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
    requiredStudents: nextHeadcount,
    slots: slotsFor(occurrence.id, nextHeadcount),
  });
  week.taskOccurrences = week.taskOccurrences.map((item) =>
    item.id === occurrenceId ? replacement : item,
  );
  invalidateGeneration(week, true);
  appendDutyWeekChange(week, ownerId, 'TASK_OCCURRENCE_UPDATED');
  return saveWeek(week, true);
}

export async function deleteTaskOccurrence(
  ownerId: string,
  weekId: string,
  occurrenceId: string,
  expectedVersion: number,
): Promise<DutyWeek> {
  const week = await findWeek(ownerId, weekId);
  assertDraft(week);
  assertVersion(week, expectedVersion);
  const occurrence = week.taskOccurrences.find((item) => item.id === occurrenceId);
  if (!occurrence)
    throw new HttpProblem(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy công việc trong tuần.');
  if (occurrence.source !== 'ONE_OFF') {
    throw new HttpProblem(422, 'VALIDATION_FAILED', 'Chỉ công việc phát sinh mới được xóa.');
  }
  const slotIds = new Set(occurrence.slots.map((slot) => slot.id));
  if (week.assignments.some((assignment) => slotIds.has(assignment.slotId) && assignment.locked)) {
    throw new HttpProblem(
      409,
      'INVALID_LOCKED_ASSIGNMENT',
      'Không thể xóa công việc có phân công đang khóa.',
    );
  }
  week.assignments = week.assignments.filter((assignment) => !slotIds.has(assignment.slotId));
  week.taskOccurrences = week.taskOccurrences.filter((item) => item.id !== occurrenceId);
  invalidateGeneration(week, true);
  appendDutyWeekChange(week, ownerId, 'TASK_OCCURRENCE_DELETED');
  return saveWeek(week, true);
}

async function refreshStudentSnapshots(week: DutyWeekHydrated): Promise<void> {
  const classroom = await ClassroomModel.findById(week.classroomId);
  if (!classroom) throw new HttpProblem(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy lớp học.');
  const group = selectedGroup(classroom as ClassroomHydrated, week.selectedGroupId);
  week.groupSnapshot = group;
  week.studentSnapshots = await studentSnapshots(
    week.classroomId,
    week.selectedGroupId,
    group.name,
  );
}

export async function getDutyWeekGenerationContext(
  ownerId: string,
  weekId: string,
): Promise<BuiltGenerationContext & { readonly serverSchedulerEngineVersion: string }> {
  const week = await findWeek(ownerId, weekId);
  assertDraft(week);
  const built = await buildGenerationContext(week, week.generationRevision + 1);
  return { ...built, serverSchedulerEngineVersion: SCHEDULER_ENGINE_VERSION };
}

export async function generateDutyWeek(
  ownerId: string,
  weekId: string,
  input: {
    readonly expectedVersion: number;
    readonly clientSchedulerEngineVersion: string;
    readonly inputHash: string;
  },
): Promise<DutyWeek> {
  const week = await findWeek(ownerId, weekId);
  assertDraft(week);
  assertVersion(week, input.expectedVersion);
  try {
    assertSchedulerVersion(input.clientSchedulerEngineVersion);
  } catch {
    throw new HttpProblem(
      409,
      'SCHEDULER_VERSION_OUTDATED',
      'Phiên bản bộ xếp lịch trên thiết bị đã cũ. Hãy tải lại ứng dụng.',
      { action: 'RELOAD_REQUIRED', serverSchedulerEngineVersion: SCHEDULER_ENGINE_VERSION },
    );
  }
  await refreshStudentSnapshots(week);
  const nextGenerationRevision = week.generationRevision + 1;
  const built = await buildGenerationContext(week, nextGenerationRevision);
  if (built.inputHash !== input.inputHash) {
    throw new HttpProblem(
      409,
      'PROPOSAL_MISMATCH',
      'Dữ liệu dùng để tạo phân công đã thay đổi. Hãy tải lại bản xem trước.',
    );
  }
  const output = generateSchedule(built.context);
  week.assignments = output.assignments.map((assignment) =>
    assignmentFromGenerated(assignment, week),
  );
  week.warnings = output.warnings.map((warning) => ({ ...warning }));
  week.relaxedRules = [
    ...new Set(
      output.warnings
        .filter((warning) => warning.code !== 'UNASSIGNED_SLOT')
        .map((warning) => warning.code),
    ),
  ];
  week.fairness = output.fairness;
  week.fairnessBaseline = [...built.fairnessBaseline];
  week.schedulerEngineVersion = output.schedulerEngineVersion;
  week.generationRevision = nextGenerationRevision;
  week.generationContextHash = built.inputHash;
  week.generationDataRevisions = built.dataRevisions;
  week.generationValidationSource = 'BACKEND_GENERATED';
  week.requiresGeneration = false;
  appendDutyWeekChange(week, ownerId, 'SCHEDULE_GENERATED');
  return saveWeek(week, false);
}

function slotDetails(
  week: DutyWeekHydrated,
  slotId: string,
): { readonly occurrence: DutyOccurrence; readonly slot: DutyOccurrence['slots'][number] } {
  for (const occurrence of week.taskOccurrences) {
    const slot = occurrence.slots.find((candidate) => candidate.id === slotId);
    if (slot) return { occurrence, slot };
  }
  throw new HttpProblem(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy vị trí phân công.');
}

async function assertCurrentAssignmentsValid(
  week: DutyWeekHydrated,
): Promise<BuiltGenerationContext> {
  const built = await buildGenerationContext(week, week.generationRevision);
  const violations = validateAssignments(built.context, schedulerAssignments(week));
  if (violations.length > 0) {
    throw new HttpProblem(
      409,
      'HARD_CONSTRAINT_VIOLATION',
      'Phân công vi phạm điều kiện bắt buộc.',
    );
  }
  return built;
}

export async function writeAssignment(
  ownerId: string,
  weekId: string,
  slotId: string,
  studentId: string | null,
  expectedVersion: number,
): Promise<DutyWeek> {
  const week = await findWeek(ownerId, weekId);
  assertDraft(week);
  assertVersion(week, expectedVersion);
  await refreshStudentSnapshots(week);
  const { occurrence, slot } = slotDetails(week, slotId);
  const existing = week.assignments.find((assignment) => assignment.slotId === slotId);
  if (existing?.locked) {
    throw new HttpProblem(
      409,
      'INVALID_LOCKED_ASSIGNMENT',
      'Hãy mở khóa phân công trước khi thay đổi.',
    );
  }
  if (studentId === null) {
    week.assignments = week.assignments.filter((assignment) => assignment.slotId !== slotId);
  } else {
    const snapshot = week.studentSnapshots.find((student) => student.id === studentId);
    if (!snapshot)
      throw new HttpProblem(422, 'HARD_CONSTRAINT_VIOLATION', 'Học sinh không thuộc tổ trực.');
    const replacement: DutyAssignment = {
      slotId,
      occurrenceId: occurrence.id,
      slotIndex: slot.index,
      studentId,
      studentDisplayName: snapshot.displayName,
      source: 'MANUAL',
      locked: false,
      reasonCodes: ['ELIGIBILITY_SATISFIED'],
      explanation: [...explainReasonCodes(['ELIGIBILITY_SATISFIED'])],
      actualStudentId: null,
      actualStudentDisplayName: null,
    };
    week.assignments = [
      ...week.assignments.filter((assignment) => assignment.slotId !== slotId),
      replacement,
    ];
    await assertCurrentAssignmentsValid(week);
  }
  week.assignments.sort((left, right) => left.slotId.localeCompare(right.slotId));
  invalidateGeneration(week, true);
  appendDutyWeekChange(
    week,
    ownerId,
    studentId === null ? 'ASSIGNMENT_CLEARED' : 'ASSIGNMENT_WRITTEN',
  );
  return saveWeek(week, true);
}

export async function setAssignmentLock(
  ownerId: string,
  weekId: string,
  slotId: string,
  locked: boolean,
  expectedVersion: number,
): Promise<DutyWeek> {
  const week = await findWeek(ownerId, weekId);
  assertDraft(week);
  assertVersion(week, expectedVersion);
  const assignment = week.assignments.find(
    (item) => item.slotId === slotId && item.studentId !== null,
  );
  if (!assignment)
    throw new HttpProblem(422, 'VALIDATION_FAILED', 'Không thể khóa vị trí chưa có người.');
  assignment.locked = locked;
  await assertCurrentAssignmentsValid(week);
  invalidateGeneration(week, true);
  appendDutyWeekChange(week, ownerId, locked ? 'ASSIGNMENT_LOCKED' : 'ASSIGNMENT_UNLOCKED');
  return saveWeek(week, true);
}

export async function getReplacementSuggestions(
  ownerId: string,
  weekId: string,
  slotId: string,
): Promise<ReturnType<typeof suggestReplacements>> {
  const week = await findWeek(ownerId, weekId);
  const built = await buildGenerationContext(week, week.generationRevision);
  return suggestReplacements(built.context, schedulerAssignments(week), slotId);
}

export async function replaceAssignment(
  ownerId: string,
  weekId: string,
  slotId: string,
  studentId: string,
  expectedVersion: number,
): Promise<DutyWeek> {
  const week = await findWeek(ownerId, weekId);
  assertDraft(week);
  assertVersion(week, expectedVersion);
  await refreshStudentSnapshots(week);
  const current = week.assignments.find((assignment) => assignment.slotId === slotId);
  if (!current || current.studentId === null) {
    throw new HttpProblem(422, 'VALIDATION_FAILED', 'Vị trí phải có người trước khi thay thế.');
  }
  if (current.locked) {
    throw new HttpProblem(
      409,
      'INVALID_LOCKED_ASSIGNMENT',
      'Hãy mở khóa phân công trước khi thay thế.',
    );
  }
  const built = await buildGenerationContext(week, week.generationRevision);
  let proposal: readonly GeneratedAssignment[];
  try {
    proposal = applyReplacement(built.context, schedulerAssignments(week), slotId, studentId);
  } catch {
    throw new HttpProblem(
      422,
      'HARD_CONSTRAINT_VIOLATION',
      'Người thay thế không hợp lệ cho công việc này.',
    );
  }
  const replaced = proposal.find((assignment) => assignment.slotId === slotId);
  const snapshot = week.studentSnapshots.find((student) => student.id === studentId);
  if (!replaced || !snapshot)
    throw new HttpProblem(422, 'HARD_CONSTRAINT_VIOLATION', 'Người thay thế không thuộc tổ trực.');
  current.studentId = studentId;
  current.studentDisplayName = snapshot.displayName;
  current.source = 'REPLACEMENT';
  current.reasonCodes = [...replaced.reasonCodes];
  current.explanation = [...explainReasonCodes(replaced.reasonCodes)];
  invalidateGeneration(week, true);
  appendDutyWeekChange(week, ownerId, 'ASSIGNMENT_REPLACED');
  return saveWeek(week, true);
}

export async function swapAssignments(
  ownerId: string,
  weekId: string,
  firstSlotId: string,
  secondSlotId: string,
  expectedVersion: number,
): Promise<DutyWeek> {
  const week = await findWeek(ownerId, weekId);
  assertDraft(week);
  assertVersion(week, expectedVersion);
  const first = week.assignments.find((assignment) => assignment.slotId === firstSlotId);
  const second = week.assignments.find((assignment) => assignment.slotId === secondSlotId);
  if (!first || !second || first.studentId === null || second.studentId === null) {
    throw new HttpProblem(422, 'VALIDATION_FAILED', 'Cả hai vị trí phải có người để hoán đổi.');
  }
  if (first.locked || second.locked) {
    throw new HttpProblem(
      409,
      'INVALID_LOCKED_ASSIGNMENT',
      'Không thể hoán đổi phân công đang khóa.',
    );
  }
  const firstStudent = { id: first.studentId, name: first.studentDisplayName };
  first.studentId = second.studentId;
  first.studentDisplayName = second.studentDisplayName;
  second.studentId = firstStudent.id;
  second.studentDisplayName = firstStudent.name;
  first.source = 'SWAP';
  second.source = 'SWAP';
  first.reasonCodes = ['ELIGIBILITY_SATISFIED'];
  second.reasonCodes = ['ELIGIBILITY_SATISFIED'];
  first.explanation = [...explainReasonCodes(first.reasonCodes)];
  second.explanation = [...explainReasonCodes(second.reasonCodes)];
  await assertCurrentAssignmentsValid(week);
  invalidateGeneration(week, true);
  appendDutyWeekChange(week, ownerId, 'ASSIGNMENTS_SWAPPED');
  return saveWeek(week, true);
}

export async function preflightDutyWeek(
  ownerId: string,
  weekId: string,
  expectedVersion: number,
): Promise<DutyWeek> {
  const week = await findWeek(ownerId, weekId);
  assertDraft(week);
  assertVersion(week, expectedVersion);
  await refreshStudentSnapshots(week);
  const built = await buildGenerationContext(week, week.generationRevision);
  assertCompleteHardValid(week, built.context);
  week.fairnessBaseline = [...built.fairnessBaseline];
  week.generationContextHash = built.inputHash;
  week.generationDataRevisions = built.dataRevisions;
  week.generationValidationSource = 'MANUAL_PREFLIGHT';
  week.schedulerEngineVersion = SCHEDULER_ENGINE_VERSION;
  week.requiresGeneration = false;
  week.fairness = calculateFairnessResult(built.context, schedulerAssignments(week), [], []);
  appendDutyWeekChange(week, ownerId, 'MANUAL_PREFLIGHT_PASSED');
  return saveWeek(week, false);
}

export async function publishDutyWeek(
  ownerId: string,
  weekId: string,
  expectedVersion: number,
): Promise<DutyWeek> {
  const week = await findWeek(ownerId, weekId);
  assertDraft(week);
  assertVersion(week, expectedVersion);
  if (week.requiresGeneration || week.generationContextHash === null) {
    throw new HttpProblem(
      409,
      'GENERATION_CONTEXT_STALE',
      'Phân công cần được tạo hoặc kiểm tra lại trước khi phát hành.',
    );
  }
  const built = await buildGenerationContext(week, week.generationRevision);
  if (built.inputHash !== week.generationContextHash) {
    throw new HttpProblem(
      409,
      'GENERATION_CONTEXT_STALE',
      'Dữ liệu lớp đã thay đổi sau lần tạo phân công gần nhất.',
    );
  }
  assertCompleteHardValid(week, built.context);
  week.status = 'PUBLISHED';
  week.publicationRevision += 1;
  appendDutyWeekChange(week, ownerId, 'WEEK_PUBLISHED');
  return saveWeek(week, false);
}

function schedulerOccurrence(
  occurrence: DutyOccurrence,
): SchedulerContext['input']['occurrences'][number] {
  return {
    id: occurrence.id,
    date: occurrence.date,
    taskTemplateId: occurrence.taskTemplateId,
    taskFingerprint: occurrence.taskFingerprint,
    taskName: occurrence.taskName,
    workloadLevel: occurrence.workloadLevel,
    eligibilityRule: occurrence.eligibilityRule,
    requiredStudents: occurrence.requiredStudents,
    enabled: occurrence.enabled,
    order: occurrence.order,
    slots: occurrence.slots,
  };
}

interface MutableCompletionLedgerEntry {
  readonly studentId: string;
  actualPoints: number;
  opportunityPoints: number;
  readonly taskCounts: Map<string, { count: number; lastPerformedDate: DutyOccurrence['date'] }>;
  readonly dutyDates: Set<DutyOccurrence['date']>;
  readonly heavyDutyDates: Set<DutyOccurrence['date']>;
  readonly pairings: Map<string, number>;
}

function completionLedger(
  week: DutyWeekHydrated,
  fallbackStudentIds: ReadonlySet<string>,
): DutyWeek['completionLedger'] {
  const mutable = new Map<string, MutableCompletionLedgerEntry>(
    week.studentSnapshots.map((student) => [
      student.id,
      {
        studentId: student.id,
        actualPoints: 0,
        opportunityPoints: 0,
        taskCounts: new Map<string, { count: number; lastPerformedDate: DutyOccurrence['date'] }>(),
        dutyDates: new Set<DutyOccurrence['date']>(),
        heavyDutyDates: new Set<DutyOccurrence['date']>(),
        pairings: new Map<string, number>(),
      } satisfies MutableCompletionLedgerEntry,
    ]),
  );
  for (const occurrence of week.taskOccurrences.filter((item) => item.enabled)) {
    const eligible = week.studentSnapshots.filter((student) =>
      isStudentEligible(
        {
          id: student.id,
          groupId: student.groupId,
          active: student.active,
          gender: student.gender,
          participationStart: student.participationStart,
          participationEnd: student.participationEnd,
          restrictions: student.restrictions,
        },
        schedulerOccurrence(occurrence),
        week.selectedGroupId,
        week.absences,
      ),
    );
    const opportunityShare =
      eligible.length > 0
        ? (occurrence.workloadLevel * occurrence.slots.length) / eligible.length
        : 0;
    for (const student of eligible) {
      const entry = mutable.get(student.id);
      if (entry) entry.opportunityPoints += opportunityShare;
    }
    const actualStudentIds = week.assignments
      .filter((assignment) => assignment.occurrenceId === occurrence.id)
      .flatMap((assignment) =>
        assignment.actualStudentId === null ? [] : [assignment.actualStudentId],
      );
    for (const studentId of actualStudentIds) {
      const entry = mutable.get(studentId);
      if (!entry) continue;
      entry.actualPoints += occurrence.workloadLevel;
      entry.dutyDates.add(occurrence.date);
      if (occurrence.workloadLevel >= 3) entry.heavyDutyDates.add(occurrence.date);
      const currentTask = entry.taskCounts.get(occurrence.taskFingerprint);
      entry.taskCounts.set(occurrence.taskFingerprint, {
        count: (currentTask?.count ?? 0) + 1,
        lastPerformedDate:
          currentTask === undefined || occurrence.date > currentTask.lastPerformedDate
            ? occurrence.date
            : currentTask.lastPerformedDate,
      });
      for (const partnerId of actualStudentIds) {
        if (partnerId !== studentId) {
          entry.pairings.set(partnerId, (entry.pairings.get(partnerId) ?? 0) + 1);
        }
      }
    }
  }
  return [...mutable.values()]
    .map((entry) => ({
      studentId: entry.studentId,
      actualPoints: entry.actualPoints,
      opportunityPoints: entry.opportunityPoints,
      tasks: [...entry.taskCounts.entries()]
        .map(([taskFingerprint, value]) => ({ taskFingerprint, ...value }))
        .sort((left, right) => left.taskFingerprint.localeCompare(right.taskFingerprint)),
      dutyDates: [...entry.dutyDates].sort(),
      heavyDutyDates: [...entry.heavyDutyDates].sort(),
      pairings: [...entry.pairings.entries()]
        .map(([studentId, count]) => ({ studentId, count }))
        .sort((left, right) => left.studentId.localeCompare(right.studentId)),
      usedAssignedPerformerFallback: fallbackStudentIds.has(entry.studentId),
    }))
    .sort((left, right) => left.studentId.localeCompare(right.studentId));
}

export async function completeDutyWeek(
  ownerId: string,
  weekId: string,
  actualPerformers: readonly { readonly slotId: string; readonly studentId: string }[],
  expectedVersion: number,
): Promise<DutyWeek> {
  const week = await findWeek(ownerId, weekId);
  assertPublished(week);
  assertVersion(week, expectedVersion);
  const actualBySlot = new Map<string, string>();
  for (const actual of actualPerformers) {
    if (actualBySlot.has(actual.slotId)) {
      throw new HttpProblem(
        422,
        'VALIDATION_FAILED',
        'Người thực hiện thực tế bị ghi trùng cho một vị trí.',
      );
    }
    actualBySlot.set(actual.slotId, actual.studentId);
  }
  const snapshotById = new Map(week.studentSnapshots.map((student) => [student.id, student]));
  const occurrenceStudentKeys = new Set<string>();
  const fallbackStudentIds = new Set<string>();
  for (const assignment of week.assignments) {
    if (assignment.studentId === null) {
      throw new HttpProblem(
        409,
        'HARD_CONSTRAINT_VIOLATION',
        'Tuần còn vị trí chưa được phân công.',
      );
    }
    const actualStudentId = actualBySlot.get(assignment.slotId) ?? assignment.studentId;
    if (!actualBySlot.has(assignment.slotId)) fallbackStudentIds.add(actualStudentId);
    const student = snapshotById.get(actualStudentId);
    const occurrence = week.taskOccurrences.find((item) => item.id === assignment.occurrenceId);
    if (!student || !occurrence || student.groupId !== week.selectedGroupId) {
      throw new HttpProblem(
        422,
        'HARD_CONSTRAINT_VIOLATION',
        'Người thực hiện thực tế phải thuộc tổ trực đã chụp.',
      );
    }
    if (
      !isStudentEligible(
        {
          id: student.id,
          groupId: student.groupId,
          active: student.active,
          gender: student.gender,
          participationStart: student.participationStart,
          participationEnd: student.participationEnd,
          restrictions: student.restrictions,
        },
        schedulerOccurrence(occurrence),
        week.selectedGroupId,
        week.absences,
      )
    ) {
      throw new HttpProblem(
        422,
        'HARD_CONSTRAINT_VIOLATION',
        'Người thực hiện thực tế không đủ điều kiện cho công việc.',
      );
    }
    const occurrenceStudentKey = `${occurrence.id}|${student.id}`;
    if (occurrenceStudentKeys.has(occurrenceStudentKey)) {
      throw new HttpProblem(
        422,
        'HARD_CONSTRAINT_VIOLATION',
        'Một học sinh không được lặp trong cùng công việc.',
      );
    }
    occurrenceStudentKeys.add(occurrenceStudentKey);
    assignment.actualStudentId = student.id;
    assignment.actualStudentDisplayName = student.displayName;
  }
  for (const slotId of actualBySlot.keys()) slotDetails(week, slotId);
  week.completionLedger = completionLedger(week, fallbackStudentIds);
  week.status = 'COMPLETED';
  appendDutyWeekChange(week, ownerId, 'WEEK_COMPLETED');
  return saveWeek(week, false);
}
