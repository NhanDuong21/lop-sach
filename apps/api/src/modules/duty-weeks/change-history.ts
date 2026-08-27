import { canonicalJson, sha256Hex } from '@lop-sach/scheduler';
import { createId } from '../../shared/ids.js';
import type { DutyWeekHydrated } from './duty-week.mapper.js';

export const CHANGE_LOG_DETAIL_LIMIT = 200;
export const CHANGE_LOG_COMPACTION_BATCH = 50;

export function emptyChangeLogSummary(): DutyWeekHydrated['changeLogSummary'] {
  return {
    totalCompacted: 0,
    firstAt: null,
    lastAt: null,
    countsByAction: {},
    chainedDigest: null,
  };
}

export function appendDutyWeekChange(
  week: DutyWeekHydrated,
  actorUserId: string,
  action: string,
  at = new Date(),
): void {
  if (week.changeLog.length >= CHANGE_LOG_DETAIL_LIMIT) {
    const compacted = week.changeLog.slice(0, CHANGE_LOG_COMPACTION_BATCH);
    const previous = week.changeLogSummary;
    const countsByAction = { ...previous.countsByAction };
    for (const entry of compacted) {
      countsByAction[entry.action] = (countsByAction[entry.action] ?? 0) + 1;
    }
    week.changeLogSummary = {
      totalCompacted: previous.totalCompacted + compacted.length,
      firstAt: previous.firstAt ?? compacted[0]?.at ?? null,
      lastAt: compacted.at(-1)?.at ?? previous.lastAt,
      countsByAction,
      chainedDigest: sha256Hex(
        canonicalJson({
          previousDigest: previous.chainedDigest,
          entries: compacted,
        }),
      ),
    };
    week.changeLog = week.changeLog.slice(CHANGE_LOG_COMPACTION_BATCH);
  }
  week.changeLog.push({ id: createId(), at: at.toISOString(), action, actorUserId });
}
