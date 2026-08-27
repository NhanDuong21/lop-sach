import { z } from 'zod';
import { ClassroomSchema } from './classroom.js';
import { DutyWeekSchema } from './duty-week.js';
import { StudentSchema } from './student.js';
import { TaskTemplateSchema } from './task-template.js';

export const BACKUP_SCHEMA_VERSION = 1 as const;
export const BACKUP_PRODUCT_VERSION = '0.1.0';

export const BackupClassroomSchema = ClassroomSchema.extend({
  dataRevision: z.number().int().nonnegative(),
});

export const BackupEnvelopeSchema = z.strictObject({
  schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
  product: z.literal('Lớp Sạch'),
  productVersion: z.string().min(1),
  exportedAt: z.string().datetime(),
  classroom: BackupClassroomSchema,
  students: z.array(StudentSchema).max(100),
  taskTemplates: z.array(TaskTemplateSchema).max(64),
  dutyWeeks: z.array(DutyWeekSchema).max(520),
});

export const BackupUploadSchema = z.strictObject({ backup: BackupEnvelopeSchema });
export const BackupRestoreRequestSchema = BackupUploadSchema.extend({
  confirmedDigest: z.string().regex(/^[a-f0-9]{64}$/u),
});
export const BackupValidationResultSchema = z.strictObject({
  digest: z.string().regex(/^[a-f0-9]{64}$/u),
  schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
  productVersion: z.string().min(1),
  exportedAt: z.string().datetime(),
  classroomName: z.string().min(1),
  studentCount: z.number().int().nonnegative(),
  taskTemplateCount: z.number().int().nonnegative(),
  dutyWeekCount: z.number().int().nonnegative(),
});

export type BackupEnvelope = z.infer<typeof BackupEnvelopeSchema>;
export type BackupValidationResult = z.infer<typeof BackupValidationResultSchema>;
