import { BSON } from 'mongodb';
import { HttpProblem } from '../../shared/problem.js';

export const DUTY_WEEK_SIZE_LIMIT_BYTES = 8 * 1024 * 1024;
export const DUTY_WEEK_NORMAL_SIZE_TARGET_BYTES = 1024 * 1024;
export const DUTY_WEEK_OCCURRENCE_LIMIT = 64;
export const DUTY_WEEK_SLOT_LIMIT = 128;
export const DUTY_WEEK_TASK_FINGERPRINT_LIMIT = 32;

export function serializedDutyWeekSize(value: object): number {
  return BSON.calculateObjectSize(value, { ignoreUndefined: false });
}

export function assertDutyWeekSize(value: object): void {
  if (serializedDutyWeekSize(value) > DUTY_WEEK_SIZE_LIMIT_BYTES) {
    throw new HttpProblem(
      422,
      'DUTY_WEEK_SIZE_LIMIT',
      'Tuần trực vượt giới hạn kích thước an toàn. Hãy giảm dữ liệu chi tiết.',
    );
  }
}

export function assertDutyWeekShapeLimits(value: {
  readonly taskOccurrences: readonly {
    readonly taskFingerprint: string;
    readonly slots: readonly unknown[];
  }[];
}): void {
  const slotCount = value.taskOccurrences.reduce(
    (total, occurrence) => total + occurrence.slots.length,
    0,
  );
  const fingerprints = new Set(
    value.taskOccurrences.map((occurrence) => occurrence.taskFingerprint),
  );
  if (
    value.taskOccurrences.length > DUTY_WEEK_OCCURRENCE_LIMIT ||
    slotCount > DUTY_WEEK_SLOT_LIMIT ||
    fingerprints.size > DUTY_WEEK_TASK_FINGERPRINT_LIMIT
  ) {
    throw new HttpProblem(
      422,
      'DUTY_WEEK_SIZE_LIMIT',
      'Tuần trực vượt giới hạn số công việc hoặc vị trí phân công.',
    );
  }
}
