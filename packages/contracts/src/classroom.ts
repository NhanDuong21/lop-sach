import { z } from 'zod';
import { SCHOOL_DAYS, SchoolDaySchema } from './date-only.js';

export const GroupSchema = z.strictObject({
  id: z.string().min(1), name: z.string().trim().min(1).max(40),
  order: z.number().int().min(0), active: z.boolean(),
});
export const ClassroomSchema = z.strictObject({
  id: z.string(), name: z.string().trim().min(1).max(60),
  schoolYear: z.string().trim().min(4).max(20), timezone: z.literal('Asia/Ho_Chi_Minh'),
  schoolDays: z.array(SchoolDaySchema).min(1).max(7), groups: z.array(GroupSchema),
  onboarding: z.strictObject({ currentStep: z.number().int().min(1).max(6), completedAt: z.string().datetime().nullable() }),
  revisionCounters: z.strictObject({ classroom: z.number().int().nonnegative(), students: z.number().int().nonnegative(), tasks: z.number().int().nonnegative() }),
  version: z.number().int().nonnegative(),
});
export const ClassroomUpsertSchema = z.strictObject({
  name: z.string().trim().min(1).max(60).default('10C8'),
  schoolYear: z.string().trim().min(4).max(20),
  schoolDays: z.array(SchoolDaySchema).min(1).max(7).default(SCHOOL_DAYS.slice(0, 6)),
});
export const ClassroomPatchSchema = ClassroomUpsertSchema.partial().extend({
  onboardingStep: z.number().int().min(1).max(6).optional(),
  completeOnboarding: z.boolean().optional(), expectedVersion: z.number().int().nonnegative(),
});
export type Classroom = z.infer<typeof ClassroomSchema>;
export type Group = z.infer<typeof GroupSchema>;
