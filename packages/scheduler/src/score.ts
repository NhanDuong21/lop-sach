import { addDateOnlyDays } from '@lop-sach/contracts';
import { normalizedHistoricalLoads } from './fairness.js';
import type {
  CandidateScore,
  GeneratedAssignment,
  SchedulerContext,
  SchedulerOccurrence,
  SchedulerStudent,
  SchedulerWarning,
  StudentHistoricalBaseline,
} from './types.js';

const SCORE_WEIGHTS = {
  historicalLoad: 35,
  currentWeekLoad: 25,
  taskFrequency: 10,
  previousWeekTask: 8,
  sameDay: 7,
  recentHeavy: 5,
  consecutiveDate: 4,
  repeatedPairing: 3,
  softGender: 2,
  taskRecency: 1,
} as const;

function occurrenceBySlot(context: SchedulerContext): ReadonlyMap<string, SchedulerOccurrence> {
  return new Map(
    context.input.occurrences.flatMap((occurrence) =>
      occurrence.slots.map((slot) => [slot.id, occurrence] as const),
    ),
  );
}

function studentBaseline(
  context: SchedulerContext,
  studentId: string,
): StudentHistoricalBaseline | undefined {
  return context.input.historicalBaseline.find((baseline) => baseline.studentId === studentId);
}

function assignmentsForStudent(
  assignments: readonly GeneratedAssignment[],
  studentId: string,
): readonly GeneratedAssignment[] {
  return assignments.filter((assignment) => assignment.studentId === studentId);
}

function requiredRelaxationLevel(
  facts: CandidateScore['facts'],
  minimumCurrentWeekPoints: number,
): 0 | 1 | 2 | 3 | 4 {
  let level: 0 | 1 | 2 | 3 | 4 = 0;
  if (facts.sameDayAssignmentCount > 0) level = facts.sameDayAllLightweight ? 1 : 4;
  if (facts.recentTaskFrequency > 0 && level < 2) level = 2;
  if (facts.consecutiveDutyDate && level < 3) level = 3;
  if (facts.currentWeekPoints > minimumCurrentWeekPoints + 2) level = 4;
  return level;
}

function reasonCodesFor(facts: CandidateScore['facts'], cohortAverage: number): readonly string[] {
  const codes = ['ELIGIBILITY_SATISFIED'];
  if (facts.normalizedHistoricalLoad <= cohortAverage) codes.push('LOWER_NORMALIZED_LOAD');
  if (facts.sameDayAssignmentCount === 0) codes.push('NO_SAME_DAY_ASSIGNMENT');
  if (!facts.taskRecentlyPerformed) codes.push('TASK_NOT_RECENT');
  return codes;
}

export function scoreCandidate(
  context: SchedulerContext,
  assignments: readonly GeneratedAssignment[],
  occurrence: SchedulerOccurrence,
  student: SchedulerStudent,
  minimumCurrentWeekPoints = 0,
): CandidateScore {
  const slots = occurrenceBySlot(context);
  const studentAssignments = assignmentsForStudent(assignments, student.id);
  const studentOccurrences = studentAssignments
    .map((assignment) => slots.get(assignment.slotId))
    .filter((item): item is SchedulerOccurrence => item !== undefined);
  const currentWeekPoints = studentOccurrences.reduce(
    (total, item) => total + item.workloadLevel,
    0,
  );
  const sameDayOccurrences = studentOccurrences.filter((item) => item.date === occurrence.date);
  const baseline = studentBaseline(context, student.id);
  const recentWeeks = baseline?.recentWeeks ?? [];
  const recentTaskFrequency = recentWeeks
    .slice(0, 4)
    .flatMap((week) => week.tasks)
    .filter((task) => task.taskFingerprint === occurrence.taskFingerprint)
    .reduce((total, task) => total + task.count, 0);
  const repeatedTaskPreviousWeek =
    recentWeeks[0]?.tasks.some((task) => task.taskFingerprint === occurrence.taskFingerprint) ??
    false;
  const taskRecentlyPerformed = recentWeeks.some((week) =>
    week.tasks.some((task) => task.taskFingerprint === occurrence.taskFingerprint),
  );
  const recentHeavyDutyCount =
    (occurrence.workloadLevel >= 3
      ? recentWeeks.slice(0, 4).reduce((total, week) => total + week.heavyDutyDates.length, 0)
      : 0) +
    (occurrence.workloadLevel >= 3
      ? studentOccurrences.filter((item) => item.workloadLevel >= 3).length
      : 0);
  const previousDate = addDateOnlyDays(occurrence.date, -1);
  const nextDate = addDateOnlyDays(occurrence.date, 1);
  const historicalDutyDates = recentWeeks.flatMap((week) => week.dutyDates);
  const allDutyDates = [...historicalDutyDates, ...studentOccurrences.map((item) => item.date)];
  const consecutiveDutyDate =
    allDutyDates.includes(previousDate) || allDutyDates.includes(nextDate);
  const currentPartners = assignments
    .filter((assignment) => assignment.occurrenceId === occurrence.id)
    .map((assignment) => assignment.studentId)
    .filter((studentId) => studentId !== student.id);
  const repeatedPairingCount = currentPartners.reduce(
    (total, partnerId) =>
      total +
      recentWeeks.reduce(
        (weekTotal, week) =>
          weekTotal +
          (week.pairings.find((pairing) => pairing.studentId === partnerId)?.count ?? 0),
        0,
      ),
    0,
  );
  const softGenderMismatch =
    (occurrence.eligibilityRule === 'PREFER_MALE' && student.gender !== 'MALE') ||
    (occurrence.eligibilityRule === 'PREFER_FEMALE' && student.gender !== 'FEMALE');
  const activeStudentIds = context.input.students
    .filter((item) => item.active && item.groupId === context.input.selectedGroupId)
    .map((item) => item.id);
  const historicalLoads = normalizedHistoricalLoads(
    context.input.historicalBaseline,
    activeStudentIds,
  );
  const normalizedHistoricalLoad = historicalLoads.get(student.id) ?? 1;
  const cohortAverage =
    historicalLoads.size > 0
      ? [...historicalLoads.values()].reduce((total, load) => total + load, 0) /
        historicalLoads.size
      : 1;
  const facts = {
    normalizedHistoricalLoad,
    currentWeekPoints,
    recentTaskFrequency,
    repeatedTaskPreviousWeek,
    sameDayAssignmentCount: sameDayOccurrences.length,
    sameDayAllLightweight:
      occurrence.workloadLevel === 1 &&
      sameDayOccurrences.every((item) => item.workloadLevel === 1),
    recentHeavyDutyCount,
    consecutiveDutyDate,
    repeatedPairingCount,
    softGenderMismatch,
    taskRecentlyPerformed,
  };
  const penalty =
    SCORE_WEIGHTS.historicalLoad * normalizedHistoricalLoad +
    SCORE_WEIGHTS.currentWeekLoad * currentWeekPoints +
    SCORE_WEIGHTS.taskFrequency * recentTaskFrequency +
    SCORE_WEIGHTS.previousWeekTask * Number(repeatedTaskPreviousWeek) +
    SCORE_WEIGHTS.sameDay * sameDayOccurrences.length +
    SCORE_WEIGHTS.recentHeavy * recentHeavyDutyCount +
    SCORE_WEIGHTS.consecutiveDate * Number(consecutiveDutyDate) +
    SCORE_WEIGHTS.repeatedPairing * repeatedPairingCount +
    SCORE_WEIGHTS.softGender * Number(softGenderMismatch) +
    SCORE_WEIGHTS.taskRecency * Number(taskRecentlyPerformed);
  return {
    studentId: student.id,
    penalty,
    requiredRelaxationLevel: requiredRelaxationLevel(facts, minimumCurrentWeekPoints),
    facts,
    reasonCodes: reasonCodesFor(facts, cohortAverage),
  };
}

export function warningsForCandidate(
  slotId: string,
  candidate: CandidateScore,
): readonly SchedulerWarning[] {
  const warnings: SchedulerWarning[] = [];
  if (candidate.facts.sameDayAssignmentCount > 0) {
    warnings.push({ code: 'SAME_DAY_ASSIGNMENT_RELAXED', slotId, studentId: candidate.studentId });
  }
  if (candidate.facts.recentTaskFrequency > 0) {
    warnings.push({ code: 'RECENT_TASK_REPEAT_RELAXED', slotId, studentId: candidate.studentId });
  }
  if (candidate.facts.consecutiveDutyDate) {
    warnings.push({ code: 'CONSECUTIVE_DATES_RELAXED', slotId, studentId: candidate.studentId });
  }
  if (candidate.requiredRelaxationLevel === 4 && candidate.facts.sameDayAssignmentCount === 0) {
    warnings.push({ code: 'WORKLOAD_BALANCE_RELAXED', slotId, studentId: candidate.studentId });
  }
  return warnings;
}

export { SCORE_WEIGHTS };
