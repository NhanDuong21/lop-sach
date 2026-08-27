import type { StudentRestriction } from '@lop-sach/contracts';
import type { SchedulerContext, SchedulerOccurrence, SchedulerStudent } from './types.js';

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
function restrictionKey(restriction: StudentRestriction): string {
  if (restriction.type === 'TASK_EXCLUSION')
    return `${restriction.type}|${restriction.taskTemplateId}|${restriction.id}`;
  if (restriction.type === 'EXEMPT_DATE_RANGE')
    return `${restriction.type}|${restriction.startDate}|${restriction.endDate}|${restriction.id}`;
  return `${restriction.type}|${restriction.id}`;
}
function normalizeStudent(student: SchedulerStudent): SchedulerStudent {
  return {
    ...student,
    restrictions: [...student.restrictions].sort((left, right) =>
      compareText(restrictionKey(left), restrictionKey(right)),
    ),
  };
}
function normalizeOccurrence(occurrence: SchedulerOccurrence): SchedulerOccurrence {
  return {
    ...occurrence,
    slots: [...occurrence.slots].sort(
      (left, right) => left.index - right.index || compareText(left.id, right.id),
    ),
  };
}
function sortedRevisionRecord(record: Readonly<Record<string, number>>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => compareText(left, right)),
  );
}

export function normalizeSchedulerContext(context: SchedulerContext): SchedulerContext {
  return {
    schedulerEngineVersion: context.schedulerEngineVersion,
    generationRevision: context.generationRevision,
    dataRevisions: {
      classroomRevision: context.dataRevisions.classroomRevision,
      studentRevisions: sortedRevisionRecord(context.dataRevisions.studentRevisions),
      taskRevisions: sortedRevisionRecord(context.dataRevisions.taskRevisions),
      weekConfigurationRevision: context.dataRevisions.weekConfigurationRevision,
    },
    input: {
      weekStart: context.input.weekStart,
      selectedGroupId: context.input.selectedGroupId,
      students: [...context.input.students]
        .map(normalizeStudent)
        .sort((left, right) => compareText(left.id, right.id)),
      occurrences: [...context.input.occurrences]
        .map(normalizeOccurrence)
        .sort(
          (left, right) =>
            compareText(left.date, right.date) ||
            left.order - right.order ||
            compareText(left.id, right.id),
        ),
      absences: [...context.input.absences].sort(
        (left, right) =>
          compareText(left.date, right.date) || compareText(left.studentId, right.studentId),
      ),
      existingAssignments: [...context.input.existingAssignments].sort(
        (left, right) =>
          compareText(left.slotId, right.slotId) || compareText(left.studentId, right.studentId),
      ),
      historicalBaseline: [...context.input.historicalBaseline].sort((left, right) =>
        compareText(left.studentId, right.studentId),
      ),
    },
  };
}
