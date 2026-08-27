import { describe, expect, it } from 'vitest';
import { generateSchedule, validateAssignments } from '../src/index.js';
import { createContext, createOccurrence, createStudent } from './fixtures.js';

describe('deterministic generation', () => {
  it('returns exactly the same canonical result for repeated runs', () => {
    const context = createContext();
    expect(generateSchedule(context)).toEqual(generateSchedule(context));
  });

  it('preserves valid manual and locked assignments', () => {
    const result = generateSchedule(createContext());
    expect(result.assignments).toContainEqual(
      expect.objectContaining({
        slotId: 'occurrence-b-slot-1',
        studentId: 'student-b',
        source: 'MANUAL',
        locked: true,
      }),
    );
  });

  it('never duplicates a student inside one occurrence', () => {
    const context = createContext();
    const result = generateSchedule(context);
    const occurrenceAssignments = result.assignments.filter(
      (assignment) => assignment.occurrenceId === 'occurrence-b',
    );
    expect(new Set(occurrenceAssignments.map((assignment) => assignment.studentId)).size).toBe(
      occurrenceAssignments.length,
    );
    expect(validateAssignments(context, result.assignments)).toEqual([]);
  });

  it('reports impossible slots instead of violating hard constraints', () => {
    const occurrence = createOccurrence({
      id: 'impossible',
      date: '2026-08-24',
      requiredStudents: 2,
    });
    const context = {
      ...createContext(),
      input: {
        ...createContext().input,
        students: [createStudent({ id: 'only-student' })],
        occurrences: [occurrence],
        absences: [],
        existingAssignments: [],
        historicalBaseline: [],
      },
    };
    const result = generateSchedule(context);
    expect(result.assignments).toHaveLength(1);
    expect(result.unassignedSlotIds).toHaveLength(1);
    expect(result.warnings).toEqual([
      { code: 'UNASSIGNED_SLOT', slotId: result.unassignedSlotIds[0], studentId: null },
    ]);
  });

  it('fails rather than silently unlocking an invalid fixed assignment', () => {
    const context = createContext();
    const invalid = {
      ...context,
      input: {
        ...context.input,
        absences: [...context.input.absences, { studentId: 'student-b', date: '2026-08-25' }],
      },
    };
    expect(() => generateSchedule(invalid)).toThrow(
      'INVALID_LOCKED_ASSIGNMENT:occurrence-b-slot-1',
    );
  });
});
