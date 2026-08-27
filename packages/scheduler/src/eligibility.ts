import type { SchedulerAbsence, SchedulerOccurrence, SchedulerStudent } from './types.js';

export function isStudentEligible(
  student: SchedulerStudent,
  occurrence: SchedulerOccurrence,
  selectedGroupId: string,
  absences: readonly SchedulerAbsence[],
): boolean {
  if (!student.active || student.groupId !== selectedGroupId) return false;
  if (student.participationStart !== null && occurrence.date < student.participationStart)
    return false;
  if (student.participationEnd !== null && occurrence.date > student.participationEnd) return false;
  if (
    absences.some((absence) => absence.studentId === student.id && absence.date === occurrence.date)
  )
    return false;
  if (occurrence.eligibilityRule === 'MALE_ONLY' && student.gender !== 'MALE') return false;
  if (occurrence.eligibilityRule === 'FEMALE_ONLY' && student.gender !== 'FEMALE') return false;
  for (const restriction of student.restrictions) {
    if (restriction.type === 'NO_HEAVY_TASKS' && occurrence.workloadLevel >= 3) return false;
    if (
      restriction.type === 'TASK_EXCLUSION' &&
      occurrence.taskTemplateId === restriction.taskTemplateId
    )
      return false;
    if (
      restriction.type === 'EXEMPT_DATE_RANGE' &&
      occurrence.date >= restriction.startDate &&
      occurrence.date <= restriction.endDate
    )
      return false;
  }
  return true;
}
