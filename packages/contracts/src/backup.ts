import { z } from 'zod';

export const BackupEnvelopeSchema = z.strictObject({
  schemaVersion: z.literal(1), product: z.literal('Lớp Sạch'), exportedAt: z.string().datetime(),
  classroom: z.unknown(), students: z.array(z.unknown()).max(100),
  taskTemplates: z.array(z.unknown()).max(64), dutyWeeks: z.array(z.unknown()).max(520),
});
export type BackupEnvelope = z.infer<typeof BackupEnvelopeSchema>;
