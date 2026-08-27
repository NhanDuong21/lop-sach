import { z } from 'zod';
import { DateOnlySchema } from './date-only.js';

export const StudentGenderSchema = z.enum(['MALE', 'FEMALE', 'UNSPECIFIED']);
const RestrictionBaseSchema = z.strictObject({
  id: z.string().min(1),
  note: z.string().trim().max(300).optional(),
});
const RestrictionWriteBaseSchema = z.strictObject({ note: z.string().trim().max(300).optional() });
export const NoHeavyTasksRestrictionSchema = RestrictionBaseSchema.extend({
  type: z.literal('NO_HEAVY_TASKS'),
});
export const TaskExclusionRestrictionSchema = RestrictionBaseSchema.extend({
  type: z.literal('TASK_EXCLUSION'),
  taskTemplateId: z.string().min(1),
});
export const ExemptDateRangeRestrictionSchema = RestrictionBaseSchema.extend({
  type: z.literal('EXEMPT_DATE_RANGE'),
  startDate: DateOnlySchema,
  endDate: DateOnlySchema,
}).refine((value) => value.endDate >= value.startDate, {
  message: 'Ngày kết thúc miễn phải từ ngày bắt đầu trở đi.',
  path: ['endDate'],
});
export const StudentRestrictionSchema = z.discriminatedUnion('type', [
  NoHeavyTasksRestrictionSchema,
  TaskExclusionRestrictionSchema,
  ExemptDateRangeRestrictionSchema,
]);
const NoHeavyTasksRestrictionWriteSchema = RestrictionWriteBaseSchema.extend({
  type: z.literal('NO_HEAVY_TASKS'),
});
const TaskExclusionRestrictionWriteSchema = RestrictionWriteBaseSchema.extend({
  type: z.literal('TASK_EXCLUSION'),
  taskTemplateId: z.string().min(1),
});
const ExemptDateRangeRestrictionWriteSchema = RestrictionWriteBaseSchema.extend({
  type: z.literal('EXEMPT_DATE_RANGE'),
  startDate: DateOnlySchema,
  endDate: DateOnlySchema,
}).refine((value) => value.endDate >= value.startDate, {
  message: 'Ngày kết thúc miễn phải từ ngày bắt đầu trở đi.',
  path: ['endDate'],
});
export const StudentRestrictionWriteSchema = z.discriminatedUnion('type', [
  NoHeavyTasksRestrictionWriteSchema,
  TaskExclusionRestrictionWriteSchema,
  ExemptDateRangeRestrictionWriteSchema,
]);
export const StudentSchema = z.strictObject({
  id: z.string(),
  classroomId: z.string(),
  displayName: z.string().trim().min(1).max(80),
  groupId: z.string(),
  active: z.boolean(),
  gender: StudentGenderSchema,
  participationStart: DateOnlySchema.nullable(),
  participationEnd: DateOnlySchema.nullable(),
  restrictions: z.array(StudentRestrictionSchema).max(32),
  version: z.number().int().nonnegative(),
});
const StudentWriteFieldsSchema = z.strictObject({
  displayName: z.string().trim().min(1).max(80),
  gender: StudentGenderSchema.default('UNSPECIFIED'),
  participationStart: DateOnlySchema.nullable().default(null),
  participationEnd: DateOnlySchema.nullable().default(null),
  restrictions: z.array(StudentRestrictionWriteSchema).max(32).default([]),
});
function validateParticipationRange(
  value: {
    readonly participationStart?: string | null | undefined;
    readonly participationEnd?: string | null | undefined;
  },
  context: z.RefinementCtx,
): void {
  if (
    typeof value.participationStart === 'string' &&
    typeof value.participationEnd === 'string' &&
    value.participationEnd < value.participationStart
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Ngày kết thúc tham gia phải từ ngày bắt đầu trở đi.',
      path: ['participationEnd'],
    });
  }
}
export const StudentCreateSchema = StudentWriteFieldsSchema.extend({
  groupId: z.string().min(1),
  active: z.boolean().default(true),
}).superRefine(validateParticipationRange);
export const StudentBulkCreateSchema = z
  .strictObject({
    groupId: z.string().min(1),
    displayNames: z.array(z.string().trim().min(1).max(80)).min(1).max(60),
  })
  .superRefine((value, context) => {
    const normalized = value.displayNames.map((name) => name.toLocaleLowerCase('vi-VN'));
    if (new Set(normalized).size !== normalized.length) {
      context.addIssue({
        code: 'custom',
        message: 'Danh sách có tên bị lặp. Hãy giữ mỗi học sinh trên một dòng.',
        path: ['displayNames'],
      });
    }
  });
export const StudentPatchSchema = StudentWriteFieldsSchema.partial()
  .extend({
    expectedVersion: z.number().int().nonnegative(),
  })
  .superRefine(validateParticipationRange);
export const StudentMoveSchema = z.strictObject({
  groupId: z.string().min(1),
  expectedVersion: z.number().int().nonnegative(),
});
export const StudentWriteSchema = StudentCreateSchema;
export type Student = z.infer<typeof StudentSchema>;
export type StudentRestriction = z.infer<typeof StudentRestrictionSchema>;
export type StudentRestrictionWrite = z.infer<typeof StudentRestrictionWriteSchema>;
export type StudentGender = z.infer<typeof StudentGenderSchema>;
export type StudentBulkCreate = z.infer<typeof StudentBulkCreateSchema>;
