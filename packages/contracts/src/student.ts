import { z } from 'zod';
import { DateOnlySchema } from './date-only.js';

export const StudentGenderSchema = z.enum(['MALE', 'FEMALE', 'UNSPECIFIED']);
const RestrictionBaseSchema = z.strictObject({ id: z.string().min(1), note: z.string().trim().max(300).optional() });
export const NoHeavyTasksRestrictionSchema = RestrictionBaseSchema.extend({ type: z.literal('NO_HEAVY_TASKS') });
export const TaskExclusionRestrictionSchema = RestrictionBaseSchema.extend({ type: z.literal('TASK_EXCLUSION'), taskTemplateId: z.string().min(1) });
export const ExemptDateRangeRestrictionSchema = RestrictionBaseSchema.extend({
  type: z.literal('EXEMPT_DATE_RANGE'), startDate: DateOnlySchema, endDate: DateOnlySchema,
}).refine((value) => value.endDate >= value.startDate, { message: 'Ngày kết thúc miễn phải từ ngày bắt đầu trở đi.', path: ['endDate'] });
export const StudentRestrictionSchema = z.discriminatedUnion('type', [NoHeavyTasksRestrictionSchema, TaskExclusionRestrictionSchema, ExemptDateRangeRestrictionSchema]);
export const StudentSchema = z.strictObject({
  id: z.string(), classroomId: z.string(), displayName: z.string().trim().min(1).max(80),
  groupId: z.string(), active: z.boolean(), gender: StudentGenderSchema,
  participationStart: DateOnlySchema.nullable(), participationEnd: DateOnlySchema.nullable(),
  restrictions: z.array(StudentRestrictionSchema).max(32), version: z.number().int().nonnegative(),
});
export const StudentWriteSchema = StudentSchema.omit({ id: true, classroomId: true, version: true }).superRefine((value, context) => {
  if (value.participationStart !== null && value.participationEnd !== null && value.participationEnd < value.participationStart) {
    context.addIssue({ code: 'custom', message: 'Ngày kết thúc tham gia phải từ ngày bắt đầu trở đi.', path: ['participationEnd'] });
  }
});
export type Student = z.infer<typeof StudentSchema>;
export type StudentRestriction = z.infer<typeof StudentRestrictionSchema>;
export type StudentGender = z.infer<typeof StudentGenderSchema>;
