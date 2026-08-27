import { scoreCandidate } from './score.js';
import type { GeneratedAssignment, SchedulerContext, SchedulerOccurrence } from './types.js';
import { validateAssignments } from './validate.js';

function occurrenceMaps(context: SchedulerContext): {
  readonly byId: ReadonlyMap<string, SchedulerOccurrence>;
} {
  return {
    byId: new Map(context.input.occurrences.map((occurrence) => [occurrence.id, occurrence])),
  };
}

export function totalSchedulePenalty(
  context: SchedulerContext,
  assignments: readonly GeneratedAssignment[],
): number {
  const { byId } = occurrenceMaps(context);
  const students = new Map(context.input.students.map((student) => [student.id, student]));
  return assignments.reduce((total, assignment, assignmentIndex) => {
    const occurrence = byId.get(assignment.occurrenceId);
    const student = students.get(assignment.studentId);
    if (!occurrence || !student) return Number.POSITIVE_INFINITY;
    const otherAssignments = assignments.filter((_item, index) => index !== assignmentIndex);
    return total + scoreCandidate(context, otherAssignments, occurrence, student).penalty;
  }, 0);
}

export function improveSchedule(
  context: SchedulerContext,
  assignments: readonly GeneratedAssignment[],
): readonly GeneratedAssignment[] {
  let working = [...assignments].sort((left, right) => left.slotId.localeCompare(right.slotId));
  const slotCount = working.length;
  const attemptLimit = Math.min(500, 4 * slotCount * slotCount);
  let attempts = 0;
  let improved = true;
  while (improved && attempts < attemptLimit) {
    improved = false;
    const currentPenalty = totalSchedulePenalty(context, working);
    outer: for (let leftIndex = 0; leftIndex < working.length; leftIndex += 1) {
      const left = working[leftIndex];
      if (!left || left.source !== 'AUTO' || left.locked) continue;
      for (let rightIndex = leftIndex + 1; rightIndex < working.length; rightIndex += 1) {
        if (attempts >= attemptLimit) break outer;
        const right = working[rightIndex];
        if (!right || right.source !== 'AUTO' || right.locked || left.studentId === right.studentId)
          continue;
        attempts += 1;
        const proposal = working.map((assignment, index) => {
          if (index === leftIndex) {
            return {
              ...assignment,
              studentId: right.studentId,
              reasonCodes: [...assignment.reasonCodes, 'LOCAL_IMPROVEMENT'],
            };
          }
          if (index === rightIndex) {
            return {
              ...assignment,
              studentId: left.studentId,
              reasonCodes: [...assignment.reasonCodes, 'LOCAL_IMPROVEMENT'],
            };
          }
          return assignment;
        });
        if (validateAssignments(context, proposal).length > 0) continue;
        if (totalSchedulePenalty(context, proposal) + Number.EPSILON < currentPenalty) {
          working = proposal;
          if (validateAssignments(context, working).length > 0) {
            throw new Error('SCHEDULER_LOCAL_IMPROVEMENT_INVARIANT_FAILED');
          }
          improved = true;
          break outer;
        }
      }
    }
  }
  const violations = validateAssignments(context, working);
  if (violations.length > 0) throw new Error('SCHEDULER_LOCAL_IMPROVEMENT_INVARIANT_FAILED');
  return working;
}
