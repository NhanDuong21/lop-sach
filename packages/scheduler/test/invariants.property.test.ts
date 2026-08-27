import { describe, expect, it } from 'vitest';
import { generateSchedule, schedulerInputHash, validateAssignments } from '../src/index.js';
import { createContext } from './fixtures.js';

function rotate<T>(values: readonly T[], distance: number): T[] {
  if (values.length === 0) return [];
  const offset = distance % values.length;
  return [...values.slice(offset), ...values.slice(0, offset)];
}

describe('scheduler permutation invariants', () => {
  it('keeps hash, result and hard constraints stable across deterministic permutations', () => {
    const original = createContext();
    const expectedHash = schedulerInputHash(original);
    const expectedOutput = generateSchedule(original);

    for (let index = 0; index < 24; index += 1) {
      const permuted = {
        ...original,
        input: {
          ...original.input,
          students: rotate(original.input.students, index),
          occurrences: rotate(original.input.occurrences, index + 1).map((occurrence) => ({
            ...occurrence,
            slots: rotate(occurrence.slots, index + 2),
          })),
          absences: rotate(original.input.absences, index + 3),
          existingAssignments: rotate(original.input.existingAssignments, index + 4),
          historicalBaseline: rotate(original.input.historicalBaseline, index + 5),
        },
      };
      expect(schedulerInputHash(permuted)).toBe(expectedHash);
      const output = generateSchedule(permuted);
      expect(output).toEqual(expectedOutput);
      expect(validateAssignments(permuted, output.assignments)).toEqual([]);
    }
  });
});
