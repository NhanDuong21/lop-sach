import {
  DateOnlySchema,
  StudentFairnessBaselineSchema,
  type StudentFairnessBaseline,
} from '@lop-sach/contracts';
import type { ClientSession, Types } from 'mongoose';
import { FAIRNESS_BASELINE_WEEK_LIMIT } from '@lop-sach/scheduler';
import { DutyWeekModel } from './duty-week.model.js';

export async function buildFairnessBaseline(
  classroomId: Types.ObjectId,
  weekStart: string,
  studentIds: readonly string[],
  session?: ClientSession,
): Promise<readonly StudentFairnessBaseline[]> {
  const query = DutyWeekModel.find({
    classroomId,
    status: 'COMPLETED',
    weekStart: { $lt: weekStart },
  })
    .sort({ weekStart: -1, _id: -1 })
    .select({ weekStart: 1, completionLedger: 1 });
  if (session) query.session(session);
  const completedWeeks = await query.lean();
  return studentIds.map((studentId) => {
    let aggregateActualPoints = 0;
    let aggregateOpportunityPoints = 0;
    const recentWeeks: StudentFairnessBaseline['recentWeeks'][number][] = [];
    for (const week of completedWeeks) {
      const ledger = week.completionLedger.find((entry) => entry.studentId === studentId);
      if (!ledger) continue;
      aggregateActualPoints += ledger.actualPoints;
      aggregateOpportunityPoints += ledger.opportunityPoints;
      if (recentWeeks.length < FAIRNESS_BASELINE_WEEK_LIMIT) {
        recentWeeks.push({
          weekStart: DateOnlySchema.parse(week.weekStart),
          tasks: ledger.tasks,
          dutyDates: ledger.dutyDates,
          heavyDutyDates: ledger.heavyDutyDates,
          pairings: ledger.pairings,
        });
      }
    }
    return StudentFairnessBaselineSchema.parse({
      studentId,
      aggregateActualPoints,
      aggregateOpportunityPoints,
      recentWeeks,
    });
  });
}
