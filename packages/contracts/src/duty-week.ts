import { z } from 'zod';
import { DateOnlySchema } from './date-only.js';
import { StudentGenderSchema, StudentRestrictionSchema } from './student.js';
import { TaskEligibilityRuleSchema, WorkloadLevelSchema } from './task-template.js';

export const DutyWeekStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'COMPLETED']);
export const DutyGroupSelectionBasisSchema = z.enum(['MANUAL', 'ROTATION', 'LOWEST_RANKING', 'TEACHER_ASSIGNED', 'OTHER']);
export const AssignmentSourceSchema = z.enum(['AUTO', 'MANUAL', 'REPLACEMENT', 'SWAP']);
export const DutyWeekAbsenceSchema = z.strictObject({ studentId: z.string(), date: DateOnlySchema });
export const StudentSnapshotSchema = z.strictObject({
  id: z.string(), displayName: z.string(), groupId: z.string(), groupName: z.string(), active: z.boolean(),
  gender: StudentGenderSchema, participationStart: DateOnlySchema.nullable(), participationEnd: DateOnlySchema.nullable(),
  restrictions: z.array(StudentRestrictionSchema), revision: z.number().int().nonnegative(),
});
export const TaskOccurrenceSchema = z.strictObject({
  id: z.string(), date: DateOnlySchema, source: z.enum(['RECURRING', 'ONE_OFF']),
  taskTemplateId: z.string().nullable(), taskTemplateRevision: z.number().int().nonnegative().nullable(),
  taskName: z.string().trim().min(1).max(80), workloadLevel: WorkloadLevelSchema,
  eligibilityRule: TaskEligibilityRuleSchema, requiredStudents: z.number().int().min(1).max(10),
  enabled: z.boolean(), order: z.number().int().nonnegative(),
});
export const AssignmentSchema = z.strictObject({
  slotId: z.string(), occurrenceId: z.string(), slotIndex: z.number().int().nonnegative(),
  studentId: z.string().nullable(), studentDisplayName: z.string().nullable(), source: AssignmentSourceSchema,
  locked: z.boolean(), reasonCodes: z.array(z.string()), explanation: z.array(z.string()),
  actualStudentId: z.string().nullable(), actualStudentDisplayName: z.string().nullable(),
});
export const FairnessResultSchema = z.strictObject({
  score: z.number().int().min(0).max(100), label: z.enum(['Rất cân bằng', 'Khá cân bằng', 'Cần xem lại']),
  minNormalizedLoad: z.number().nonnegative(), maxNormalizedLoad: z.number().nonnegative(),
  averageNormalizedLoad: z.number().nonnegative(),
  workloadByStudent: z.array(z.strictObject({ studentId: z.string(), currentWeekPoints: z.number().nonnegative(), normalizedHistoricalLoad: z.number().nonnegative() })),
  repeatedTaskCount: z.number().int().nonnegative(), sameDayOverloadCount: z.number().int().nonnegative(),
  unassignedSlotCount: z.number().int().nonnegative(), explanationCodes: z.array(z.string()),
});
export const GenerationRevisionVectorSchema = z.strictObject({
  classroomRevision: z.number().int().nonnegative(),
  studentRevisions: z.record(z.string(), z.number().int().nonnegative()),
  taskRevisions: z.record(z.string(), z.number().int().nonnegative()),
  weekConfigurationRevision: z.number().int().nonnegative(),
});
export type AssignmentSource = z.infer<typeof AssignmentSourceSchema>;
export type DutyGroupSelectionBasis = z.infer<typeof DutyGroupSelectionBasisSchema>;
export type DutyWeekStatus = z.infer<typeof DutyWeekStatusSchema>;
export type FairnessResult = z.infer<typeof FairnessResultSchema>;
