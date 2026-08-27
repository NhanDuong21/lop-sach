import { addDateOnlyDays, parseDateOnly } from '@lop-sach/contracts';
import { describe, expect, it } from 'vitest';
import {
  FAIRNESS_BASELINE_WEEK_LIMIT,
  boundRecentWeeks,
  generateSchedule,
  normalizedHistoricalLoads,
} from '../src/index.js';
import type { StudentRecentWeekSummary } from '../src/index.js';
import { createContext, createOccurrence, createStudent } from './fixtures.js';

function recentWeek(weekStart: string): StudentRecentWeekSummary {
  return {
    weekStart: parseDateOnly(weekStart),
    tasks: [],
    dutyDates: [],
    heavyDutyDates: [],
    pairings: [],
  };
}

describe('bounded fairness baseline', () => {
  it('uses the approved opportunity formula with prior P=4', () => {
    const loads = normalizedHistoricalLoads(
      [
        {
          studentId: 'experienced',
          aggregateActualPoints: 8,
          aggregateOpportunityPoints: 8,
          recentWeeks: [],
        },
      ],
      ['experienced', 'new-student'],
    );
    expect(loads.get('experienced')).toBe(1);
    expect(loads.get('new-student')).toBe(1);
  });

  it('retains exactly the eight newest eligible weeks in deterministic order', () => {
    const oldest = parseDateOnly('2026-06-29');
    const nineWeeks = Array.from({ length: 9 }, (_, index) =>
      recentWeek(addDateOnlyDays(oldest, index * 7)),
    ).reverse();
    const bounded = boundRecentWeeks([
      nineWeeks[3]!,
      nineWeeks[8]!,
      ...nineWeeks.slice(0, 3),
      ...nineWeeks.slice(4, 8),
    ]);
    expect(bounded).toHaveLength(FAIRNESS_BASELINE_WEEK_LIMIT);
    expect(bounded.map((week) => week.weekStart)).toEqual(
      nineWeeks.slice(0, FAIRNESS_BASELINE_WEEK_LIMIT).map((week) => week.weekStart),
    );
    expect(bounded.some((week) => week.weekStart === oldest)).toBe(false);
  });

  it('does not overload a new student to catch up with historical points', () => {
    const context = createContext();
    const balanced = {
      ...context,
      input: {
        ...context.input,
        students: [createStudent({ id: 'experienced' }), createStudent({ id: 'new-student' })],
        occurrences: [
          createOccurrence({ id: 'one', date: '2026-08-24' }),
          createOccurrence({ id: 'two', date: '2026-08-26' }),
          createOccurrence({ id: 'three', date: '2026-08-28' }),
          createOccurrence({ id: 'four', date: '2026-08-29' }),
        ],
        absences: [],
        existingAssignments: [],
        historicalBaseline: [
          {
            studentId: 'experienced',
            aggregateActualPoints: 12,
            aggregateOpportunityPoints: 12,
            recentWeeks: [],
          },
        ],
      },
    };
    const output = generateSchedule(balanced);
    const counts = new Map<string, number>();
    for (const assignment of output.assignments) {
      counts.set(assignment.studentId, (counts.get(assignment.studentId) ?? 0) + 1);
    }
    expect(counts.get('new-student')).toBeLessThanOrEqual(2);
    expect(counts.get('experienced')).toBeLessThanOrEqual(2);
  });

  it('caps the fairness score when an enabled slot is unassigned', () => {
    const context = createContext();
    const impossible = {
      ...context,
      input: {
        ...context.input,
        students: [],
        occurrences: [createOccurrence({ id: 'unassigned', date: '2026-08-24' })],
        existingAssignments: [],
        historicalBaseline: [],
      },
    };
    expect(generateSchedule(impossible).fairness.score).toBeLessThanOrEqual(64);
  });
});
