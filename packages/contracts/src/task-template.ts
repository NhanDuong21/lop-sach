import { z } from 'zod';
import { SchoolDaySchema } from './date-only.js';

export const TaskEligibilityRuleSchema = z.enum([
  'ANY',
  'PREFER_MALE',
  'MALE_ONLY',
  'PREFER_FEMALE',
  'FEMALE_ONLY',
]);
export const WorkloadLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);
export const TaskTemplateSchema = z.strictObject({
  id: z.string(),
  classroomId: z.string(),
  name: z.string().trim().min(1).max(80),
  active: z.boolean(),
  order: z.number().int().nonnegative(),
  schoolDays: z.array(SchoolDaySchema).min(1).max(7),
  requiredStudents: z.number().int().min(1).max(10),
  workloadLevel: WorkloadLevelSchema,
  eligibilityRule: TaskEligibilityRuleSchema,
  version: z.number().int().nonnegative(),
});
export const TaskTemplateWriteSchema = TaskTemplateSchema.omit({
  id: true,
  classroomId: true,
  version: true,
});
export const TaskTemplateCreateSchema = TaskTemplateWriteSchema.omit({ order: true }).extend({
  active: z.boolean().default(true),
});
export const TaskTemplatePatchSchema = TaskTemplateCreateSchema.omit({ active: true })
  .partial()
  .extend({
    expectedVersion: z.number().int().nonnegative(),
  });
export const TaskTemplateOrderSchema = z.strictObject({
  taskIds: z
    .array(z.string().min(1))
    .min(1)
    .max(64)
    .refine((values) => new Set(values).size === values.length, 'Danh sách task không được trùng.'),
  expectedTasksRevision: z.number().int().nonnegative(),
});
export type TaskEligibilityRule = z.infer<typeof TaskEligibilityRuleSchema>;
export type TaskTemplate = z.infer<typeof TaskTemplateSchema>;
export type WorkloadLevel = z.infer<typeof WorkloadLevelSchema>;
