import { DutyWeekSchema, type DutyWeek } from '@lop-sach/contracts';
import type { HydratedDocument } from 'mongoose';
import type { DutyWeekDocument } from './duty-week.model.js';

export type DutyWeekHydrated = HydratedDocument<DutyWeekDocument> & { version: number };

export function mapDutyWeek(document: DutyWeekHydrated, generationStale: boolean): DutyWeek {
  return DutyWeekSchema.parse({
    id: String(document._id),
    classroomId: String(document.classroomId),
    weekStart: document.weekStart,
    status: document.status,
    selectedGroupId: document.selectedGroupId,
    selectionBasis: document.selectionBasis,
    selectionNote: document.selectionNote,
    groupSnapshot: document.groupSnapshot,
    studentSnapshots: document.studentSnapshots,
    taskOccurrences: document.taskOccurrences,
    absences: document.absences,
    assignments: document.assignments,
    warnings: document.warnings,
    relaxedRules: document.relaxedRules,
    fairness: document.fairness,
    fairnessBaseline: document.fairnessBaseline,
    completionLedger: document.completionLedger,
    schedulerEngineVersion: document.schedulerEngineVersion,
    generationRevision: document.generationRevision,
    generationContextHash: document.generationContextHash,
    generationDataRevisions: document.generationDataRevisions,
    generationValidationSource: document.generationValidationSource,
    configurationRevision: document.configurationRevision,
    requiresGeneration: document.requiresGeneration,
    generationStale,
    publicationRevision: document.publicationRevision,
    version: document.version,
    changeLog: document.changeLog,
    changeLogSummary: document.changeLogSummary,
  });
}
