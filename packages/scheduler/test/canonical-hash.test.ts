import { describe, expect, it } from 'vitest';
import {
  SchedulerVersionOutdatedError,
  assertSchedulerVersion,
  generateSchedule,
  schedulerInputHash,
  sha256Hex,
} from '../src/index.js';
import { createContext, reverseSemanticSets } from './fixtures.js';

describe('canonical scheduler integrity hash', () => {
  it('matches the published SHA-256 test vector', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('keeps the same hash and output when semantic sets have another order', () => {
    const context = createContext();
    const permuted = reverseSemanticSets(context);

    expect(schedulerInputHash(permuted)).toBe(schedulerInputHash(context));
    expect(generateSchedule(permuted)).toEqual(generateSchedule(context));
  });

  it.each([
    [
      'engine version',
      (context: ReturnType<typeof createContext>) => ({
        ...context,
        schedulerEngineVersion: '1.0.1',
      }),
    ],
    [
      'generation revision',
      (context: ReturnType<typeof createContext>) => ({ ...context, generationRevision: 5 }),
    ],
    [
      'classroom revision',
      (context: ReturnType<typeof createContext>) => ({
        ...context,
        dataRevisions: { ...context.dataRevisions, classroomRevision: 4 },
      }),
    ],
    [
      'student data',
      (context: ReturnType<typeof createContext>) => ({
        ...context,
        input: {
          ...context.input,
          students: context.input.students.map((student) =>
            student.id === 'student-a' ? { ...student, active: false } : student,
          ),
        },
      }),
    ],
  ])('changes when %s changes', (_label, mutate) => {
    const context = createContext();
    expect(schedulerInputHash(mutate(context))).not.toBe(schedulerInputHash(context));
  });

  it('requires reload for an outdated client scheduler', () => {
    expect(() => assertSchedulerVersion('0.9.0')).toThrow(SchedulerVersionOutdatedError);
    try {
      assertSchedulerVersion('0.9.0');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'SCHEDULER_VERSION_OUTDATED',
        action: 'RELOAD_REQUIRED',
        serverSchedulerEngineVersion: '1.0.0',
      });
    }
    expect(() => assertSchedulerVersion('1.0.0')).not.toThrow();
  });
});
