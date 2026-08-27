import { isStudentEligible } from './eligibility.js';
import type { ConstraintViolation, GeneratedAssignment, SchedulerContext } from './types.js';

export function validateAssignments(
  context: SchedulerContext,
  assignments: readonly GeneratedAssignment[],
): readonly ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];
  const students = new Map(context.input.students.map((student) => [student.id, student]));
  const occurrences = new Map(
    context.input.occurrences.map((occurrence) => [occurrence.id, occurrence]),
  );
  const slots = new Map(
    context.input.occurrences.flatMap((occurrence) =>
      occurrence.slots.map((slot) => [slot.id, occurrence] as const),
    ),
  );
  const seenSlots = new Set<string>();
  const occurrenceStudents = new Set<string>();
  for (const assignment of assignments) {
    if (seenSlots.has(assignment.slotId))
      violations.push({ code: 'DUPLICATE_SLOT_ASSIGNMENT', slotId: assignment.slotId });
    seenSlots.add(assignment.slotId);
    const occurrence = slots.get(assignment.slotId);
    const student = students.get(assignment.studentId);
    if (!occurrence || occurrence.id !== assignment.occurrenceId) {
      violations.push({ code: 'SLOT_OCCURRENCE_MISMATCH', slotId: assignment.slotId });
      continue;
    }
    if (
      !student ||
      !isStudentEligible(student, occurrence, context.input.selectedGroupId, context.input.absences)
    ) {
      violations.push({
        code: 'INELIGIBLE_ASSIGNMENT',
        slotId: assignment.slotId,
        studentId: assignment.studentId,
      });
      continue;
    }
    const occurrenceStudent = `${occurrence.id}|${student.id}`;
    if (occurrenceStudents.has(occurrenceStudent))
      violations.push({
        code: 'DUPLICATE_STUDENT_IN_OCCURRENCE',
        slotId: assignment.slotId,
        studentId: student.id,
      });
    occurrenceStudents.add(occurrenceStudent);
  }
  for (const occurrence of occurrences.values()) {
    if (!occurrence.enabled) continue;
    const assigned = assignments.filter(
      (assignment) => assignment.occurrenceId === occurrence.id,
    ).length;
    if (assigned > occurrence.requiredStudents)
      violations.push({ code: 'OCCURRENCE_OVER_ASSIGNED' });
  }
  return violations;
}
