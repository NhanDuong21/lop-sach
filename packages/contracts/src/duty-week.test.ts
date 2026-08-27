import { describe, expect, it } from 'vitest';
import {
  DutyWeekAbsencesWriteSchema,
  DutyWeekCreateSchema,
  TaskOccurrenceSchema,
} from './duty-week.js';

const occurrence = {
  id: 'occurrence-1',
  date: '2026-08-24',
  source: 'ONE_OFF',
  taskTemplateId: null,
  taskTemplateRevision: null,
  taskFingerprint: 'one-off:occurrence-1',
  taskName: 'Lau cửa sổ',
  workloadLevel: 2,
  eligibilityRule: 'ANY',
  requiredStudents: 1,
  enabled: true,
  order: 0,
  slots: [{ id: 'slot-1', index: 0 }],
};

describe('duty-week date-only contracts', () => {
  it('accepts Monday week starts and rejects other weekdays', () => {
    expect(
      DutyWeekCreateSchema.safeParse({
        weekStart: '2026-08-24',
        selectedGroupId: 'group-1',
      }).success,
    ).toBe(true);
    expect(
      DutyWeekCreateSchema.safeParse({
        weekStart: '2026-08-25',
        selectedGroupId: 'group-1',
      }).success,
    ).toBe(false);
  });

  it.each(['startTime', 'endTime', 'timeBucket'])('rejects speculative %s fields', (field) => {
    expect(TaskOccurrenceSchema.safeParse({ ...occurrence, [field]: '08:00' }).success).toBe(false);
  });

  it('keeps specific-date availability only in duty-week absences', () => {
    expect(
      DutyWeekAbsencesWriteSchema.parse({
        expectedVersion: 0,
        absences: [{ studentId: 'student-1', date: '2026-08-24' }],
      }).absences,
    ).toHaveLength(1);
  });
});
