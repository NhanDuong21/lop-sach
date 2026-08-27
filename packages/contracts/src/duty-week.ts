import { z } from 'zod';
import { DateOnlySchema, mondayOfWeek } from './date-only.js';
import { StudentGenderSchema, StudentRestrictionSchema } from './student.js';
import { TaskEligibilityRuleSchema, WorkloadLevelSchema } from './task-template.js';

export const DutyWeekStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'COMPLETED']);
export const DutyGroupSelectionBasisSchema = z.enum([
  'MANUAL',
  'ROTATION',
  'LOWEST_RANKING',
  'TEACHER_ASSIGNED',
  'OTHER',
]);
export const AssignmentSourceSchema = z.enum(['AUTO', 'MANUAL', 'REPLACEMENT', 'SWAP']);
export const GenerationValidationSourceSchema = z.enum(['BACKEND_GENERATED', 'MANUAL_PREFLIGHT']);
export const DutyWeekAbsenceSchema = z.strictObject({
  studentId: z.string(),
  date: DateOnlySchema,
});
export const DutyWeekSlotSchema = z.strictObject({
  id: z.string().min(1),
  index: z.number().int().nonnegative(),
});
export const StudentSnapshotSchema = z.strictObject({
  id: z.string(),
  displayName: z.string(),
  groupId: z.string(),
  groupName: z.string(),
  active: z.boolean(),
  gender: StudentGenderSchema,
  participationStart: DateOnlySchema.nullable(),
  participationEnd: DateOnlySchema.nullable(),
  restrictions: z.array(StudentRestrictionSchema),
  revision: z.number().int().nonnegative(),
});
export const TaskOccurrenceSchema = z.strictObject({
  id: z.string(),
  date: DateOnlySchema,
  source: z.enum(['RECURRING', 'ONE_OFF']),
  taskTemplateId: z.string().nullable(),
  taskTemplateRevision: z.number().int().nonnegative().nullable(),
  taskFingerprint: z.string().min(1),
  taskName: z.string().trim().min(1).max(80),
  workloadLevel: WorkloadLevelSchema,
  eligibilityRule: TaskEligibilityRuleSchema,
  requiredStudents: z.number().int().min(1).max(10),
  enabled: z.boolean(),
  order: z.number().int().nonnegative(),
  slots: z.array(DutyWeekSlotSchema).min(1).max(10),
});
export const AssignmentSchema = z.strictObject({
  slotId: z.string(),
  occurrenceId: z.string(),
  slotIndex: z.number().int().nonnegative(),
  studentId: z.string().nullable(),
  studentDisplayName: z.string().nullable(),
  source: AssignmentSourceSchema,
  locked: z.boolean(),
  reasonCodes: z.array(z.string()),
  explanation: z.array(z.string()),
  actualStudentId: z.string().nullable(),
  actualStudentDisplayName: z.string().nullable(),
});
export const SchedulerWarningSchema = z.strictObject({
  code: z.string().min(1),
  slotId: z.string().min(1),
  studentId: z.string().nullable(),
});
export const FairnessResultSchema = z.strictObject({
  score: z.number().int().min(0).max(100),
  label: z.enum(['Rất cân bằng', 'Khá cân bằng', 'Cần xem lại']),
  minNormalizedLoad: z.number().nonnegative(),
  maxNormalizedLoad: z.number().nonnegative(),
  averageNormalizedLoad: z.number().nonnegative(),
  workloadByStudent: z.array(
    z.strictObject({
      studentId: z.string(),
      currentWeekPoints: z.number().nonnegative(),
      normalizedHistoricalLoad: z.number().nonnegative(),
    }),
  ),
  repeatedTaskCount: z.number().int().nonnegative(),
  sameDayOverloadCount: z.number().int().nonnegative(),
  unassignedSlotCount: z.number().int().nonnegative(),
  explanationCodes: z.array(z.string()),
});
export const GenerationRevisionVectorSchema = z.strictObject({
  classroomRevision: z.number().int().nonnegative(),
  studentRevisions: z.record(z.string(), z.number().int().nonnegative()),
  taskRevisions: z.record(z.string(), z.number().int().nonnegative()),
  weekConfigurationRevision: z.number().int().nonnegative(),
});
export const RecentTaskSummarySchema = z.strictObject({
  taskFingerprint: z.string().min(1),
  count: z.number().int().positive(),
  lastPerformedDate: DateOnlySchema,
});
export const RecentPairingSummarySchema = z.strictObject({
  studentId: z.string().min(1),
  count: z.number().int().positive(),
});
export const StudentRecentWeekSummarySchema = z.strictObject({
  weekStart: DateOnlySchema,
  tasks: z.array(RecentTaskSummarySchema).max(32),
  dutyDates: z.array(DateOnlySchema).max(7),
  heavyDutyDates: z.array(DateOnlySchema).max(7),
  pairings: z.array(RecentPairingSummarySchema).max(64),
});
export const StudentFairnessBaselineSchema = z.strictObject({
  studentId: z.string().min(1),
  aggregateActualPoints: z.number().nonnegative(),
  aggregateOpportunityPoints: z.number().nonnegative(),
  recentWeeks: z.array(StudentRecentWeekSummarySchema).max(8),
});
export const CompletionLedgerEntrySchema = z.strictObject({
  studentId: z.string().min(1),
  actualPoints: z.number().nonnegative(),
  opportunityPoints: z.number().nonnegative(),
  tasks: z.array(RecentTaskSummarySchema).max(32),
  dutyDates: z.array(DateOnlySchema).max(7),
  heavyDutyDates: z.array(DateOnlySchema).max(7),
  pairings: z.array(RecentPairingSummarySchema).max(64),
  usedAssignedPerformerFallback: z.boolean(),
});
export const ChangeLogEntrySchema = z.strictObject({
  id: z.string().min(1),
  at: z.string().datetime(),
  action: z.string().min(1),
  actorUserId: z.string().min(1),
});
export const ChangeLogSummarySchema = z.strictObject({
  totalCompacted: z.number().int().nonnegative(),
  firstAt: z.string().datetime().nullable(),
  lastAt: z.string().datetime().nullable(),
  countsByAction: z.record(z.string(), z.number().int().nonnegative()),
  chainedDigest: z
    .string()
    .regex(/^[a-f0-9]{64}$/u)
    .nullable(),
});
export const DutyWeekSchema = z.strictObject({
  id: z.string(),
  classroomId: z.string(),
  weekStart: DateOnlySchema,
  status: DutyWeekStatusSchema,
  selectedGroupId: z.string(),
  selectionBasis: DutyGroupSelectionBasisSchema,
  selectionNote: z.string().max(500),
  groupSnapshot: z.strictObject({ id: z.string(), name: z.string() }),
  studentSnapshots: z.array(StudentSnapshotSchema),
  taskOccurrences: z.array(TaskOccurrenceSchema).max(64),
  absences: z.array(DutyWeekAbsenceSchema),
  assignments: z.array(AssignmentSchema).max(128),
  warnings: z.array(SchedulerWarningSchema),
  relaxedRules: z.array(z.string()),
  fairness: FairnessResultSchema.nullable(),
  fairnessBaseline: z.array(StudentFairnessBaselineSchema),
  completionLedger: z.array(CompletionLedgerEntrySchema),
  schedulerEngineVersion: z.string(),
  generationRevision: z.number().int().nonnegative(),
  generationContextHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/u)
    .nullable(),
  generationDataRevisions: GenerationRevisionVectorSchema.nullable(),
  generationValidationSource: GenerationValidationSourceSchema.nullable(),
  configurationRevision: z.number().int().nonnegative(),
  requiresGeneration: z.boolean(),
  generationStale: z.boolean(),
  publicationRevision: z.number().int().nonnegative(),
  version: z.number().int().nonnegative(),
  changeLog: z.array(ChangeLogEntrySchema).max(200),
  changeLogSummary: ChangeLogSummarySchema,
});

const MondaySchema = DateOnlySchema.refine((value) => mondayOfWeek(value) === value, {
  message: 'Ngày bắt đầu tuần phải là Thứ Hai.',
});
export const DutyWeekCreateSchema = z.strictObject({
  weekStart: MondaySchema,
  selectedGroupId: z.string().min(1),
  selectionBasis: DutyGroupSelectionBasisSchema.default('MANUAL'),
  selectionNote: z.string().trim().max(500).default(''),
});
export const DutyWeekPatchSchema = z.strictObject({
  selectedGroupId: z.string().min(1).optional(),
  selectionBasis: DutyGroupSelectionBasisSchema.optional(),
  selectionNote: z.string().trim().max(500).optional(),
  expectedVersion: z.number().int().nonnegative(),
});
export const DutyWeekAbsencesWriteSchema = z.strictObject({
  absences: z.array(DutyWeekAbsenceSchema).max(128),
  expectedVersion: z.number().int().nonnegative(),
});
export const TaskOccurrenceCreateSchema = z.strictObject({
  date: DateOnlySchema,
  taskName: z.string().trim().min(1).max(80),
  workloadLevel: WorkloadLevelSchema,
  eligibilityRule: TaskEligibilityRuleSchema.default('ANY'),
  requiredStudents: z.number().int().min(1).max(10),
  enabled: z.boolean().default(true),
  expectedVersion: z.number().int().nonnegative(),
});
export const TaskOccurrencePatchSchema = TaskOccurrenceCreateSchema.omit({ expectedVersion: true })
  .partial()
  .extend({ expectedVersion: z.number().int().nonnegative() });
export const VersionedDutyWeekMutationSchema = z.strictObject({
  expectedVersion: z.number().int().nonnegative(),
});
export const GenerateDutyWeekSchema = VersionedDutyWeekMutationSchema.extend({
  clientSchedulerEngineVersion: z.string().min(1),
  inputHash: z.string().regex(/^[a-f0-9]{64}$/u),
});
export const AssignmentWriteSchema = VersionedDutyWeekMutationSchema.extend({
  studentId: z.string().min(1).nullable(),
});
export const AssignmentLockSchema = VersionedDutyWeekMutationSchema.extend({ locked: z.boolean() });
export const ReplacementWriteSchema = VersionedDutyWeekMutationSchema.extend({
  studentId: z.string().min(1),
});
export const AssignmentSwapSchema = VersionedDutyWeekMutationSchema.extend({
  firstSlotId: z.string().min(1),
  secondSlotId: z.string().min(1),
}).refine((value) => value.firstSlotId !== value.secondSlotId, {
  message: 'Hai slot hoán đổi phải khác nhau.',
  path: ['secondSlotId'],
});
export const CompleteDutyWeekSchema = VersionedDutyWeekMutationSchema.extend({
  actualPerformers: z
    .array(
      z.strictObject({
        slotId: z.string().min(1),
        studentId: z.string().min(1),
      }),
    )
    .max(128)
    .default([]),
});

export type AssignmentSource = z.infer<typeof AssignmentSourceSchema>;
export type DutyGroupSelectionBasis = z.infer<typeof DutyGroupSelectionBasisSchema>;
export type DutyWeek = z.infer<typeof DutyWeekSchema>;
export type DutyWeekStatus = z.infer<typeof DutyWeekStatusSchema>;
export type FairnessResult = z.infer<typeof FairnessResultSchema>;
export type StudentFairnessBaseline = z.infer<typeof StudentFairnessBaselineSchema>;
