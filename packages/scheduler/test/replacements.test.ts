import { parseDateOnly } from '@lop-sach/contracts';
import { describe, expect, it } from 'vitest';
import {
  applyReplacement,
  improveSchedule,
  suggestReplacements,
  totalSchedulePenalty,
  validateAssignments,
} from '../src/index.js';
import type { GeneratedAssignment, StudentHistoricalBaseline } from '../src/index.js';
import { createContext, createOccurrence, createStudent } from './fixtures.js';

function baseline(studentId: string, taskFingerprint: string): StudentHistoricalBaseline {
  return {
    studentId,
    aggregateActualPoints: 1,
    aggregateOpportunityPoints: 2,
    recentWeeks: [
      {
        weekStart: parseDateOnly('2026-08-17'),
        tasks: [
          {
            taskFingerprint,
            count: 1,
            lastPerformedDate: parseDateOnly('2026-08-18'),
          },
        ],
        dutyDates: [parseDateOnly('2026-08-18')],
        heavyDutyDates: [],
        pairings: [],
      },
    ],
  };
}

describe('local improvement and replacements', () => {
  it('accepts only a strict deterministic improvement and preserves hard constraints', () => {
    const base = createContext();
    const context = {
      ...base,
      input: {
        ...base.input,
        students: [createStudent({ id: 'student-a' }), createStudent({ id: 'student-b' })],
        occurrences: [
          createOccurrence({ id: 'task-x', date: '2026-08-24', taskFingerprint: 'task-x' }),
          createOccurrence({ id: 'task-y', date: '2026-08-28', taskFingerprint: 'task-y' }),
        ],
        absences: [],
        existingAssignments: [],
        historicalBaseline: [baseline('student-a', 'task-x'), baseline('student-b', 'task-y')],
      },
    };
    const assignments: readonly GeneratedAssignment[] = [
      {
        slotId: 'task-x-slot-1',
        occurrenceId: 'task-x',
        studentId: 'student-a',
        source: 'AUTO',
        locked: false,
        reasonCodes: [],
      },
      {
        slotId: 'task-y-slot-1',
        occurrenceId: 'task-y',
        studentId: 'student-b',
        source: 'AUTO',
        locked: false,
        reasonCodes: [],
      },
    ];
    const improved = improveSchedule(context, assignments);
    expect(totalSchedulePenalty(context, improved)).toBeLessThan(
      totalSchedulePenalty(context, assignments),
    );
    expect(improved.find((item) => item.slotId === 'task-x-slot-1')?.studentId).toBe('student-b');
    expect(validateAssignments(context, improved)).toEqual([]);
  });

  it('ranks hard-eligible replacements and changes only the requested slot', () => {
    const context = createContext();
    const assignments = [
      {
        slotId: 'occurrence-b-slot-1',
        occurrenceId: 'occurrence-b',
        studentId: 'student-b',
        source: 'MANUAL' as const,
        locked: false,
        reasonCodes: [],
      },
      {
        slotId: 'occurrence-b-slot-2',
        occurrenceId: 'occurrence-b',
        studentId: 'student-c',
        source: 'AUTO' as const,
        locked: false,
        reasonCodes: [],
      },
    ];
    const suggestions = suggestReplacements(context, assignments, 'occurrence-b-slot-1');
    expect(suggestions.map((item) => item.studentId)).toContain('student-a');
    expect(suggestions.map((item) => item.studentId)).not.toContain('student-c');
    expect(suggestions[0]?.explanations.length).toBeGreaterThan(0);
    const replaced = applyReplacement(context, assignments, 'occurrence-b-slot-1', 'student-a');
    expect(replaced.find((item) => item.slotId === 'occurrence-b-slot-1')?.studentId).toBe(
      'student-a',
    );
    expect(replaced.find((item) => item.slotId === 'occurrence-b-slot-2')).toEqual(assignments[1]);
  });
});
