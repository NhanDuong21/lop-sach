import { schedulerInputHash } from './canonical-hash.js';
import { isStudentEligible } from './eligibility.js';
import { calculateFairnessResult } from './fairness.js';
import { improveSchedule } from './improve.js';
import { normalizeSchedulerContext } from './normalize.js';
import { candidateTieValue } from './seed.js';
import { scoreCandidate, warningsForCandidate } from './score.js';
import type {
  CandidateScore,
  ExistingAssignment,
  GeneratedAssignment,
  SchedulerContext,
  SchedulerOccurrence,
  SchedulerOutput,
  SchedulerSlot,
  SchedulerWarning,
} from './types.js';
import { validateAssignments } from './validate.js';

interface SlotWithOccurrence {
  readonly slot: SchedulerSlot;
  readonly occurrence: SchedulerOccurrence;
}

function fixedAssignment(existing: ExistingAssignment): boolean {
  return existing.locked || existing.source !== 'AUTO';
}

export function generateSchedule(rawContext: SchedulerContext): SchedulerOutput {
  const context = normalizeSchedulerContext(rawContext);
  const inputHash = schedulerInputHash(context);
  const enabledOccurrences = context.input.occurrences.filter((occurrence) => occurrence.enabled);
  for (const occurrence of enabledOccurrences) {
    if (occurrence.slots.length !== occurrence.requiredStudents)
      throw new Error(`INVALID_SLOT_COUNT:${occurrence.id}`);
  }
  const allSlots: SlotWithOccurrence[] = enabledOccurrences.flatMap((occurrence) =>
    occurrence.slots.map((slot) => ({ slot, occurrence })),
  );
  const slotMap = new Map(allSlots.map((item) => [item.slot.id, item]));
  const studentMap = new Map(context.input.students.map((student) => [student.id, student]));
  const assignments: GeneratedAssignment[] = [];
  const assignedByOccurrence = new Map<string, Set<string>>();
  const currentPoints = new Map<string, number>();

  for (const existing of context.input.existingAssignments.filter(fixedAssignment)) {
    const item = slotMap.get(existing.slotId);
    const student = studentMap.get(existing.studentId);
    const occurrenceStudents = item
      ? (assignedByOccurrence.get(item.occurrence.id) ?? new Set<string>())
      : new Set<string>();
    if (
      !item ||
      !student ||
      !isStudentEligible(
        student,
        item.occurrence,
        context.input.selectedGroupId,
        context.input.absences,
        existing.source === 'TEACHER_ASSIGNED',
      ) ||
      occurrenceStudents.has(student.id)
    ) {
      throw new Error(`INVALID_LOCKED_ASSIGNMENT:${existing.slotId}`);
    }
    if (assignments.some((assignment) => assignment.slotId === existing.slotId))
      throw new Error(`INVALID_LOCKED_ASSIGNMENT:${existing.slotId}`);
    occurrenceStudents.add(student.id);
    assignedByOccurrence.set(item.occurrence.id, occurrenceStudents);
    currentPoints.set(
      student.id,
      (currentPoints.get(student.id) ?? 0) + item.occurrence.workloadLevel,
    );
    assignments.push({
      slotId: item.slot.id,
      occurrenceId: item.occurrence.id,
      studentId: student.id,
      source: existing.source,
      locked: existing.locked,
      reasonCodes:
        existing.source === 'TEACHER_ASSIGNED'
          ? ['TEACHER_ASSIGNED', 'FIXED_ASSIGNMENT']
          : ['FIXED_ASSIGNMENT'],
    });
  }

  const remaining = allSlots.filter(
    (item) => !assignments.some((assignment) => assignment.slotId === item.slot.id),
  );
  remaining.sort((left, right) => {
    const leftCount = context.input.students.filter((student) =>
      isStudentEligible(
        student,
        left.occurrence,
        context.input.selectedGroupId,
        context.input.absences,
      ),
    ).length;
    const rightCount = context.input.students.filter((student) =>
      isStudentEligible(
        student,
        right.occurrence,
        context.input.selectedGroupId,
        context.input.absences,
      ),
    ).length;
    return (
      leftCount - rightCount ||
      right.occurrence.workloadLevel - left.occurrence.workloadLevel ||
      left.occurrence.date.localeCompare(right.occurrence.date) ||
      left.occurrence.order - right.occurrence.order ||
      left.slot.index - right.slot.index ||
      left.slot.id.localeCompare(right.slot.id)
    );
  });

  const unassignedSlotIds: string[] = [];
  const seed = `${context.input.weekStart}|${context.generationRevision}`;
  for (const item of remaining) {
    const occurrenceStudents = assignedByOccurrence.get(item.occurrence.id) ?? new Set<string>();
    const hardEligibleStudents = context.input.students.filter(
      (student) =>
        isStudentEligible(
          student,
          item.occurrence,
          context.input.selectedGroupId,
          context.input.absences,
        ) && !occurrenceStudents.has(student.id),
    );
    const candidateCurrentPoints = hardEligibleStudents.map(
      (student) => currentPoints.get(student.id) ?? 0,
    );
    const minimumCurrentPoints =
      candidateCurrentPoints.length > 0 ? Math.min(...candidateCurrentPoints) : 0;
    const candidates: CandidateScore[] = hardEligibleStudents.map((student) =>
      scoreCandidate(context, assignments, item.occurrence, student, minimumCurrentPoints),
    );
    candidates.sort(
      (left, right) =>
        left.requiredRelaxationLevel - right.requiredRelaxationLevel ||
        left.penalty - right.penalty ||
        candidateTieValue(seed, item.slot.id, left.studentId) -
          candidateTieValue(seed, item.slot.id, right.studentId) ||
        left.studentId.localeCompare(right.studentId),
    );
    const selected = candidates[0];
    if (!selected) {
      unassignedSlotIds.push(item.slot.id);
      continue;
    }
    occurrenceStudents.add(selected.studentId);
    assignedByOccurrence.set(item.occurrence.id, occurrenceStudents);
    currentPoints.set(
      selected.studentId,
      (currentPoints.get(selected.studentId) ?? 0) + item.occurrence.workloadLevel,
    );
    assignments.push({
      slotId: item.slot.id,
      occurrenceId: item.occurrence.id,
      studentId: selected.studentId,
      source: 'AUTO',
      locked: false,
      reasonCodes: selected.reasonCodes,
    });
  }
  const improvedAssignments = [...improveSchedule(context, assignments)].sort((left, right) =>
    left.slotId.localeCompare(right.slotId),
  );
  const violations = validateAssignments(context, improvedAssignments);
  if (violations.length > 0)
    throw new Error(
      `SCHEDULER_INVARIANT_FAILED:${violations.map((violation) => violation.code).join(',')}`,
    );
  const warnings: SchedulerWarning[] = [];
  for (const assignment of improvedAssignments) {
    if (assignment.source !== 'AUTO') continue;
    const occurrence = enabledOccurrences.find((item) => item.id === assignment.occurrenceId);
    const student = studentMap.get(assignment.studentId);
    if (!occurrence || !student) continue;
    const others = improvedAssignments.filter((item) => item.slotId !== assignment.slotId);
    warnings.push(
      ...warningsForCandidate(
        assignment.slotId,
        scoreCandidate(context, others, occurrence, student),
      ),
    );
  }
  const sortedUnassignedSlotIds = [...unassignedSlotIds].sort();
  warnings.push(
    ...sortedUnassignedSlotIds.map((slotId) => ({
      code: 'UNASSIGNED_SLOT' as const,
      slotId,
      studentId: null,
    })),
  );
  warnings.sort(
    (left, right) => left.slotId.localeCompare(right.slotId) || left.code.localeCompare(right.code),
  );
  return {
    schedulerEngineVersion: context.schedulerEngineVersion,
    inputHash,
    assignments: improvedAssignments,
    unassignedSlotIds: sortedUnassignedSlotIds,
    warnings,
    fairness: calculateFairnessResult(
      context,
      improvedAssignments,
      sortedUnassignedSlotIds,
      warnings,
    ),
  };
}
