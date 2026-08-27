import type { DutyWeek } from '@lop-sach/contracts';
import { describe, expect, it } from 'vitest';
import { currentWeekDisplay } from './offline-cache.js';

describe('current-week offline display DTO', () => {
  it('keeps only display data and prefers the actual performer snapshot', () => {
    const week = {
      id: 'internal-week-id',
      weekStart: '2026-08-24',
      status: 'COMPLETED',
      groupSnapshot: { id: 'internal-group-id', name: 'Tổ 1' },
      taskOccurrences: [
        {
          id: 'internal-occurrence-id',
          date: '2026-08-24',
          taskName: 'Lau bảng',
          enabled: true,
          order: 0,
          slots: [{ id: 'internal-slot-id', index: 0 }],
        },
      ],
      assignments: [
        {
          slotId: 'internal-slot-id',
          studentDisplayName: 'An',
          actualStudentDisplayName: 'Bình',
        },
      ],
      warnings: [{ code: 'SAME_DAY_ASSIGNMENT' }],
      publicationRevision: 2,
      generationContextHash: 'a'.repeat(64),
    } as unknown as DutyWeek;
    const display = currentWeekDisplay(week, '10C8');
    expect(display).toMatchObject({
      classroomName: '10C8',
      groupName: 'Tổ 1',
      status: 'COMPLETED',
      publicationRevision: 2,
      warningCount: 1,
      days: [{ tasks: [{ taskName: 'Lau bảng', performers: ['Bình'] }] }],
    });
    const serialized = JSON.stringify(display);
    expect(serialized).not.toContain('internal-');
    expect(serialized).not.toContain('generationContextHash');
    expect(serialized).not.toContain('a'.repeat(64));
  });
});
