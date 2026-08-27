import { explainReasonCodes } from './explain.js';
import { isStudentEligible } from './eligibility.js';
import { candidateTieValue } from './seed.js';
import { scoreCandidate } from './score.js';
import type {
  GeneratedAssignment,
  ReplacementSuggestion,
  SchedulerContext,
  SchedulerOccurrence,
} from './types.js';
import { validateAssignments } from './validate.js';

function occurrenceForSlot(
  context: SchedulerContext,
  slotId: string,
): SchedulerOccurrence | undefined {
  return context.input.occurrences.find((occurrence) =>
    occurrence.slots.some((slot) => slot.id === slotId),
  );
}

export function suggestReplacements(
  context: SchedulerContext,
  assignments: readonly GeneratedAssignment[],
  slotId: string,
  limit = 5,
): readonly ReplacementSuggestion[] {
  const occurrence = occurrenceForSlot(context, slotId);
  if (!occurrence) throw new Error(`UNKNOWN_SLOT:${slotId}`);
  const target = assignments.find((assignment) => assignment.slotId === slotId);
  const remaining = assignments.filter((assignment) => assignment.slotId !== slotId);
  const occupiedInOccurrence = new Set(
    remaining
      .filter((assignment) => assignment.occurrenceId === occurrence.id)
      .map((assignment) => assignment.studentId),
  );
  const currentPoints = new Map<string, number>();
  const occurrenceById = new Map(context.input.occurrences.map((item) => [item.id, item] as const));
  for (const assignment of remaining) {
    const item = occurrenceById.get(assignment.occurrenceId);
    if (item) {
      currentPoints.set(
        assignment.studentId,
        (currentPoints.get(assignment.studentId) ?? 0) + item.workloadLevel,
      );
    }
  }
  const hardEligible = context.input.students.filter(
    (student) =>
      student.id !== target?.studentId &&
      !occupiedInOccurrence.has(student.id) &&
      isStudentEligible(student, occurrence, context.input.selectedGroupId, context.input.absences),
  );
  const candidateCurrentPoints = hardEligible.map((student) => currentPoints.get(student.id) ?? 0);
  const minimumCurrentPoints =
    candidateCurrentPoints.length > 0 ? Math.min(...candidateCurrentPoints) : 0;
  return hardEligible
    .map((student) => scoreCandidate(context, remaining, occurrence, student, minimumCurrentPoints))
    .sort(
      (left, right) =>
        left.requiredRelaxationLevel - right.requiredRelaxationLevel ||
        left.penalty - right.penalty ||
        candidateTieValue(context.input.weekStart, slotId, left.studentId) -
          candidateTieValue(context.input.weekStart, slotId, right.studentId) ||
        left.studentId.localeCompare(right.studentId),
    )
    .slice(0, Math.max(0, limit))
    .map((candidate) => ({
      ...candidate,
      explanations: explainReasonCodes(candidate.reasonCodes),
    }));
}

export function applyReplacement(
  context: SchedulerContext,
  assignments: readonly GeneratedAssignment[],
  slotId: string,
  studentId: string,
): readonly GeneratedAssignment[] {
  const suggestions = suggestReplacements(
    context,
    assignments,
    slotId,
    context.input.students.length,
  );
  const suggestion = suggestions.find((item) => item.studentId === studentId);
  if (!suggestion) throw new Error(`INVALID_REPLACEMENT:${slotId}:${studentId}`);
  const proposal = assignments.map((assignment) =>
    assignment.slotId === slotId
      ? {
          ...assignment,
          studentId,
          source: 'MANUAL' as const,
          locked: false,
          reasonCodes: suggestion.reasonCodes,
        }
      : assignment,
  );
  if (proposal.every((assignment) => assignment.slotId !== slotId)) {
    throw new Error(`UNKNOWN_SLOT:${slotId}`);
  }
  if (validateAssignments(context, proposal).length > 0) {
    throw new Error(`INVALID_REPLACEMENT:${slotId}:${studentId}`);
  }
  return proposal;
}
