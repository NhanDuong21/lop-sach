import './setup.js';
import { addDateOnlyDays, parseDateOnly } from '@lop-sach/contracts';
import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import {
  CHANGE_LOG_DETAIL_LIMIT,
  appendDutyWeekChange,
  emptyChangeLogSummary,
} from '../modules/duty-weeks/change-history.js';
import {
  DUTY_WEEK_NORMAL_SIZE_TARGET_BYTES,
  DUTY_WEEK_SIZE_LIMIT_BYTES,
  assertDutyWeekShapeLimits,
  assertDutyWeekSize,
  serializedDutyWeekSize,
} from '../modules/duty-weeks/document-size.js';
import type { DutyWeekHydrated } from '../modules/duty-weeks/duty-week.mapper.js';
import { DutyWeekModel } from '../modules/duty-weeks/duty-week.model.js';
import { buildFairnessBaseline } from '../modules/duty-weeks/fairness-baseline.js';

function minimalWeek(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const ownerId = new mongoose.Types.ObjectId();
  const classroomId = new mongoose.Types.ObjectId();
  return {
    ownerId,
    classroomId,
    weekStart: '2026-08-24',
    status: 'DRAFT',
    selectedGroupId: 'group-1',
    selectionBasis: 'MANUAL',
    selectionNote: '',
    groupSnapshot: { id: 'group-1', name: 'Tổ 1' },
    studentSnapshots: [],
    taskOccurrences: [],
    absences: [],
    assignments: [],
    warnings: [],
    relaxedRules: [],
    fairness: null,
    fairnessBaseline: [],
    completionLedger: [],
    schedulerEngineVersion: '1.0.0',
    generationRevision: 0,
    generationContextHash: null,
    generationDataRevisions: null,
    generationValidationSource: null,
    configurationRevision: 1,
    requiresGeneration: true,
    publicationRevision: 0,
    changeLog: [],
    changeLogSummary: emptyChangeLogSummary(),
    ...overrides,
  };
}

describe('bounded duty-week documents', () => {
  it('keeps a normal fixture below 1 MiB and rejects growth beyond the 8 MiB guard', () => {
    const normal = minimalWeek({
      taskOccurrences: Array.from({ length: 24 }, (_, index) => ({
        id: `occurrence-${String(index)}`,
        taskFingerprint: `task-${String(index % 3)}`,
        slots: [{ id: `slot-${String(index)}`, index: 0 }],
      })),
    });
    expect(serializedDutyWeekSize(normal)).toBeLessThan(DUTY_WEEK_NORMAL_SIZE_TARGET_BYTES);
    try {
      assertDutyWeekSize({ payload: 'x'.repeat(DUTY_WEEK_SIZE_LIMIT_BYTES) });
      throw new Error('Expected the size guard to reject the fixture.');
    } catch (error) {
      expect(error).toMatchObject({ code: 'DUTY_WEEK_SIZE_LIMIT' });
    }
  });

  it('enforces occurrence, slot and task-fingerprint bounds before MongoDB limits', () => {
    const occurrences = Array.from({ length: 33 }, (_, index) => ({
      taskFingerprint: `fingerprint-${String(index)}`,
      slots: [{ id: `slot-${String(index)}` }],
    }));
    try {
      assertDutyWeekShapeLimits({ taskOccurrences: occurrences });
      throw new Error('Expected the shape guard to reject the fixture.');
    } catch (error) {
      expect(error).toMatchObject({ code: 'DUTY_WEEK_SIZE_LIMIT' });
    }
  });

  it('compacts detailed history with a chained digest and never grows past 200 entries', () => {
    const week = new DutyWeekModel(minimalWeek()) as DutyWeekHydrated;
    for (let index = 0; index < 1_000; index += 1) {
      appendDutyWeekChange(week, String(week.ownerId), index % 2 === 0 ? 'EDITED' : 'LOCKED');
    }
    expect(week.changeLog.length).toBeLessThanOrEqual(CHANGE_LOG_DETAIL_LIMIT);
    expect(week.changeLogSummary.totalCompacted).toBe(800);
    expect(week.changeLogSummary.countsByAction).toEqual({ EDITED: 400, LOCKED: 400 });
    expect(week.changeLogSummary.chainedDigest).toMatch(/^[a-f0-9]{64}$/u);
  });

  it('aggregates all actual/opportunity points but embeds only the newest eight summaries', async () => {
    const classroomId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId().toString();
    const oldest = parseDateOnly('2026-06-22');
    await DutyWeekModel.insertMany(
      Array.from({ length: 9 }, (_, index) => {
        const weekStart = addDateOnlyDays(oldest, index * 7);
        return minimalWeek({
          classroomId,
          weekStart,
          status: 'COMPLETED',
          completionLedger: [
            {
              studentId,
              actualPoints: 1,
              opportunityPoints: 2,
              tasks: [],
              dutyDates: [],
              heavyDutyDates: [],
              pairings: [],
              usedAssignedPerformerFallback: false,
            },
          ],
        });
      }),
    );
    const baseline = await buildFairnessBaseline(classroomId, addDateOnlyDays(oldest, 9 * 7), [
      studentId,
    ]);
    expect(baseline[0]).toMatchObject({
      aggregateActualPoints: 9,
      aggregateOpportunityPoints: 18,
    });
    expect(baseline[0]?.recentWeeks).toHaveLength(8);
    expect(baseline[0]?.recentWeeks.some((week) => week.weekStart === oldest)).toBe(false);
  });
});
