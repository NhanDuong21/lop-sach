import { describe, expect, it } from 'vitest';
import { StudentRestrictionSchema, StudentWriteSchema } from './student.js';

describe('student availability contracts', () => {
  it('accepts only the three persistent restriction types', () => {
    expect(StudentRestrictionSchema.safeParse({ id: 'r1', type: 'NO_HEAVY_TASKS' }).success).toBe(
      true,
    );
    expect(
      StudentRestrictionSchema.safeParse({ id: 'r2', type: 'UNAVAILABLE_DATE', date: '2026-09-01' })
        .success,
    ).toBe(false);
  });
  it('rejects an inverted participation range', () => {
    const result = StudentWriteSchema.safeParse({
      displayName: 'An',
      groupId: 'group-1',
      active: true,
      gender: 'UNSPECIFIED',
      participationStart: '2026-09-02',
      participationEnd: '2026-09-01',
      restrictions: [],
    });
    expect(result.success).toBe(false);
  });
});
