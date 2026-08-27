import { describe, expect, it } from 'vitest';
import { generateSchedule, validateAssignments } from '../src/index.js';
import { createContext, createOccurrence, createStudent } from './fixtures.js';

describe('controlled soft-constraint relaxation', () => {
  it('uses same-day assignment only as a soft rule and emits a visible warning when necessary', () => {
    const context = createContext();
    const sameDay = {
      ...context,
      input: {
        ...context.input,
        students: [createStudent({ id: 'only-student' })],
        occurrences: [
          createOccurrence({ id: 'light-one', date: '2026-08-24', workloadLevel: 1 }),
          createOccurrence({ id: 'light-two', date: '2026-08-24', workloadLevel: 1 }),
        ],
        absences: [],
        existingAssignments: [],
        historicalBaseline: [],
      },
    };
    const output = generateSchedule(sameDay);
    expect(output.assignments).toHaveLength(2);
    expect(output.warnings).toContainEqual(
      expect.objectContaining({ code: 'SAME_DAY_ASSIGNMENT_RELAXED', studentId: 'only-student' }),
    );
    expect(validateAssignments(sameDay, output.assignments)).toEqual([]);
  });

  it('avoids same-day reuse while a hard-eligible alternative exists', () => {
    const context = createContext();
    const sameDay = {
      ...context,
      input: {
        ...context.input,
        students: [createStudent({ id: 'student-a' }), createStudent({ id: 'student-b' })],
        occurrences: [
          createOccurrence({ id: 'one', date: '2026-08-24' }),
          createOccurrence({ id: 'two', date: '2026-08-24' }),
        ],
        absences: [],
        existingAssignments: [],
        historicalBaseline: [],
      },
    };
    const output = generateSchedule(sameDay);
    expect(new Set(output.assignments.map((assignment) => assignment.studentId)).size).toBe(2);
    expect(output.warnings.some((warning) => warning.code === 'SAME_DAY_ASSIGNMENT_RELAXED')).toBe(
      false,
    );
  });
});
