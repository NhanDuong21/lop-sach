import type { FairnessResult } from '@lop-sach/contracts';
import type {
  GeneratedAssignment,
  SchedulerContext,
  SchedulerWarning,
  StudentHistoricalBaseline,
  StudentRecentWeekSummary,
} from './types.js';

export const FAIRNESS_BASELINE_WEEK_LIMIT = 8;
export const FAIRNESS_PRIOR = 4;

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function boundRecentWeeks(
  recentWeeks: readonly StudentRecentWeekSummary[],
): readonly StudentRecentWeekSummary[] {
  return [...recentWeeks]
    .map((week) => ({
      ...week,
      tasks: [...week.tasks].sort(
        (left, right) =>
          compareText(left.taskFingerprint, right.taskFingerprint) ||
          compareText(left.lastPerformedDate, right.lastPerformedDate) ||
          left.count - right.count,
      ),
      dutyDates: [...new Set(week.dutyDates)].sort(compareText),
      heavyDutyDates: [...new Set(week.heavyDutyDates)].sort(compareText),
      pairings: [...week.pairings].sort(
        (left, right) => compareText(left.studentId, right.studentId) || left.count - right.count,
      ),
    }))
    .sort((left, right) => compareText(right.weekStart, left.weekStart))
    .slice(0, FAIRNESS_BASELINE_WEEK_LIMIT);
}

export function normalizeHistoricalBaseline(
  baseline: StudentHistoricalBaseline,
): StudentHistoricalBaseline {
  return { ...baseline, recentWeeks: boundRecentWeeks(baseline.recentWeeks) };
}

export function normalizedHistoricalLoads(
  baselines: readonly StudentHistoricalBaseline[],
  studentIds: readonly string[],
): ReadonlyMap<string, number> {
  const baselineByStudent = new Map(baselines.map((baseline) => [baseline.studentId, baseline]));
  const totalActual = studentIds.reduce(
    (total, studentId) => total + (baselineByStudent.get(studentId)?.aggregateActualPoints ?? 0),
    0,
  );
  const totalOpportunity = studentIds.reduce(
    (total, studentId) =>
      total + (baselineByStudent.get(studentId)?.aggregateOpportunityPoints ?? 0),
    0,
  );
  const cohortRate = totalOpportunity > 0 ? totalActual / totalOpportunity : 1;
  return new Map(
    studentIds.map((studentId) => {
      const baseline = baselineByStudent.get(studentId);
      const actual = baseline?.aggregateActualPoints ?? 0;
      const opportunity = baseline?.aggregateOpportunityPoints ?? 0;
      return [
        studentId,
        (actual + FAIRNESS_PRIOR * cohortRate) / (opportunity + FAIRNESS_PRIOR),
      ] as const;
    }),
  );
}

function roundMetric(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function occurrenceBySlot(
  context: SchedulerContext,
): ReadonlyMap<string, (typeof context.input.occurrences)[number]> {
  return new Map(
    context.input.occurrences.flatMap((occurrence) =>
      occurrence.slots.map((slot) => [slot.id, occurrence] as const),
    ),
  );
}

export function calculateFairnessResult(
  context: SchedulerContext,
  assignments: readonly GeneratedAssignment[],
  unassignedSlotIds: readonly string[],
  warnings: readonly SchedulerWarning[],
): FairnessResult {
  const eligibleStudentIds = context.input.students
    .filter((student) => student.active && student.groupId === context.input.selectedGroupId)
    .map((student) => student.id)
    .sort(compareText);
  const historicalLoads = normalizedHistoricalLoads(
    context.input.historicalBaseline,
    eligibleStudentIds,
  );
  const slots = occurrenceBySlot(context);
  const currentPoints = new Map(eligibleStudentIds.map((studentId) => [studentId, 0]));
  const assignmentDates = new Map<string, string[]>();
  const assignmentTasks = new Map<string, string[]>();
  for (const assignment of assignments) {
    const occurrence = slots.get(assignment.slotId);
    if (!occurrence) continue;
    currentPoints.set(
      assignment.studentId,
      (currentPoints.get(assignment.studentId) ?? 0) + occurrence.workloadLevel,
    );
    assignmentDates.set(assignment.studentId, [
      ...(assignmentDates.get(assignment.studentId) ?? []),
      occurrence.date,
    ]);
    assignmentTasks.set(assignment.studentId, [
      ...(assignmentTasks.get(assignment.studentId) ?? []),
      occurrence.taskFingerprint,
    ]);
  }
  const workloadByStudent = eligibleStudentIds.map((studentId) => ({
    studentId,
    currentWeekPoints: currentPoints.get(studentId) ?? 0,
    normalizedHistoricalLoad: roundMetric(historicalLoads.get(studentId) ?? 1),
  }));
  const projectedLoads = workloadByStudent.map(
    (item) => item.normalizedHistoricalLoad + item.currentWeekPoints,
  );
  const minimum = projectedLoads.length > 0 ? Math.min(...projectedLoads) : 0;
  const maximum = projectedLoads.length > 0 ? Math.max(...projectedLoads) : 0;
  const average =
    projectedLoads.length > 0
      ? projectedLoads.reduce((total, value) => total + value, 0) / projectedLoads.length
      : 0;
  const sameDayOverloadCount = [...assignmentDates.values()].reduce(
    (total, dates) => total + dates.length - new Set(dates).size,
    0,
  );
  const repeatedTaskCount = [...assignmentTasks.values()].reduce(
    (total, tasks) => total + tasks.length - new Set(tasks).size,
    0,
  );
  const enabledSlotCount = context.input.occurrences
    .filter((occurrence) => occurrence.enabled)
    .reduce((total, occurrence) => total + occurrence.slots.length, 0);
  const imbalanceRatio = average > 0 ? Math.min(1, (maximum - minimum) / Math.max(1, average)) : 0;
  const unassignedRatio = enabledSlotCount > 0 ? unassignedSlotIds.length / enabledSlotCount : 0;
  const repeatedRatio = assignments.length > 0 ? repeatedTaskCount / assignments.length : 0;
  const sameDayRatio = assignments.length > 0 ? sameDayOverloadCount / assignments.length : 0;
  const relaxationCount = warnings.filter((warning) => warning.code !== 'UNASSIGNED_SLOT').length;
  const relaxationRatio = assignments.length > 0 ? relaxationCount / assignments.length : 0;
  const deduction =
    45 * Math.min(1, imbalanceRatio) +
    25 * Math.min(1, unassignedRatio) +
    15 * Math.min(1, repeatedRatio) +
    10 * Math.min(1, sameDayRatio) +
    5 * Math.min(1, relaxationRatio);
  let score = Math.max(0, Math.min(100, Math.round(100 - deduction)));
  if (unassignedSlotIds.length > 0) score = Math.min(score, 64);
  const label = score >= 85 ? 'Rất cân bằng' : score >= 65 ? 'Khá cân bằng' : 'Cần xem lại';
  const explanationCodes: string[] = [];
  if (unassignedSlotIds.length > 0) explanationCodes.push('HAS_UNASSIGNED_SLOTS');
  if (sameDayOverloadCount > 0) explanationCodes.push('HAS_SAME_DAY_OVERLOAD');
  if (repeatedTaskCount > 0) explanationCodes.push('HAS_REPEATED_TASKS');
  if (relaxationCount > 0) explanationCodes.push('USED_CONTROLLED_RELAXATION');
  return {
    score,
    label,
    minNormalizedLoad: roundMetric(minimum),
    maxNormalizedLoad: roundMetric(maximum),
    averageNormalizedLoad: roundMetric(average),
    workloadByStudent,
    repeatedTaskCount,
    sameDayOverloadCount,
    unassignedSlotCount: unassignedSlotIds.length,
    explanationCodes,
  };
}
