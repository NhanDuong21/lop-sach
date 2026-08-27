import { parseDateOnly } from '@lop-sach/contracts';
import type { SchedulerContext, SchedulerOccurrence, SchedulerStudent } from '../src/index.js';

export function createStudent(
  overrides: Partial<SchedulerStudent> & Pick<SchedulerStudent, 'id'>,
): SchedulerStudent {
  return {
    id: overrides.id,
    groupId: overrides.groupId ?? 'group-1',
    active: overrides.active ?? true,
    gender: overrides.gender ?? 'UNSPECIFIED',
    participationStart: overrides.participationStart ?? null,
    participationEnd: overrides.participationEnd ?? null,
    restrictions: overrides.restrictions ?? [],
  };
}

export function createOccurrence(
  overrides: Omit<Partial<SchedulerOccurrence>, 'date'> &
    Pick<SchedulerOccurrence, 'id'> & { readonly date: string },
): SchedulerOccurrence {
  const requiredStudents = overrides.requiredStudents ?? 1;
  return {
    id: overrides.id,
    date: parseDateOnly(overrides.date),
    taskTemplateId: overrides.taskTemplateId ?? `task-${overrides.id}`,
    taskFingerprint: overrides.taskFingerprint ?? `fingerprint-${overrides.id}`,
    taskName: overrides.taskName ?? `Công việc ${overrides.id}`,
    workloadLevel: overrides.workloadLevel ?? 1,
    eligibilityRule: overrides.eligibilityRule ?? 'ANY',
    requiredStudents,
    enabled: overrides.enabled ?? true,
    order: overrides.order ?? 0,
    slots:
      overrides.slots ??
      Array.from({ length: requiredStudents }, (_, index) => ({
        id: `${overrides.id}-slot-${String(index + 1)}`,
        index,
      })),
  };
}

export function createContext(): SchedulerContext {
  return {
    schedulerEngineVersion: '1.0.0',
    generationRevision: 4,
    dataRevisions: {
      classroomRevision: 3,
      studentRevisions: { 'student-b': 7, 'student-a': 5, 'student-c': 2 },
      taskRevisions: { 'task-occurrence-b': 3, 'task-occurrence-a': 1 },
      weekConfigurationRevision: 6,
    },
    input: {
      weekStart: parseDateOnly('2026-08-24'),
      selectedGroupId: 'group-1',
      students: [
        createStudent({
          id: 'student-b',
          gender: 'FEMALE',
          restrictions: [
            { id: 'restriction-b2', type: 'TASK_EXCLUSION', taskTemplateId: 'task-unused' },
            {
              id: 'restriction-b1',
              type: 'EXEMPT_DATE_RANGE',
              startDate: parseDateOnly('2026-09-10'),
              endDate: parseDateOnly('2026-09-11'),
            },
          ],
        }),
        createStudent({ id: 'student-a', gender: 'MALE' }),
        createStudent({ id: 'student-c' }),
      ],
      occurrences: [
        createOccurrence({
          id: 'occurrence-b',
          date: '2026-08-25',
          taskTemplateId: 'task-occurrence-b',
          workloadLevel: 2,
          requiredStudents: 2,
          order: 1,
          slots: [
            { id: 'occurrence-b-slot-2', index: 1 },
            { id: 'occurrence-b-slot-1', index: 0 },
          ],
        }),
        createOccurrence({
          id: 'occurrence-a',
          date: '2026-08-24',
          taskTemplateId: 'task-occurrence-a',
          eligibilityRule: 'MALE_ONLY',
          order: 0,
        }),
      ],
      absences: [
        { studentId: 'student-c', date: parseDateOnly('2026-08-26') },
        { studentId: 'student-b', date: parseDateOnly('2026-08-24') },
      ],
      existingAssignments: [
        { slotId: 'occurrence-b-slot-2', studentId: 'student-c', source: 'AUTO', locked: false },
        { slotId: 'occurrence-b-slot-1', studentId: 'student-b', source: 'MANUAL', locked: true },
      ],
      historicalBaseline: [
        {
          studentId: 'student-c',
          aggregateActualPoints: 2,
          aggregateOpportunityPoints: 8,
          recentWeeks: [],
        },
        {
          studentId: 'student-a',
          aggregateActualPoints: 4,
          aggregateOpportunityPoints: 8,
          recentWeeks: [],
        },
        {
          studentId: 'student-b',
          aggregateActualPoints: 3,
          aggregateOpportunityPoints: 8,
          recentWeeks: [],
        },
      ],
    },
  };
}

export function reverseSemanticSets(context: SchedulerContext): SchedulerContext {
  return {
    ...context,
    dataRevisions: {
      ...context.dataRevisions,
      studentRevisions: Object.fromEntries(
        Object.entries(context.dataRevisions.studentRevisions).reverse(),
      ),
      taskRevisions: Object.fromEntries(
        Object.entries(context.dataRevisions.taskRevisions).reverse(),
      ),
    },
    input: {
      ...context.input,
      students: [...context.input.students]
        .reverse()
        .map((student) => ({ ...student, restrictions: [...student.restrictions].reverse() })),
      occurrences: [...context.input.occurrences]
        .reverse()
        .map((occurrence) => ({ ...occurrence, slots: [...occurrence.slots].reverse() })),
      absences: [...context.input.absences].reverse(),
      existingAssignments: [...context.input.existingAssignments].reverse(),
      historicalBaseline: [...context.input.historicalBaseline].reverse(),
    },
  };
}
