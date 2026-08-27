import type { DutyGroupSelectionBasis, DutyWeek, DutyWeekStatus } from '@lop-sach/contracts';
import mongoose, { type Model } from 'mongoose';

const { Schema, model, models } = mongoose;

export interface DutyWeekDocument {
  ownerId: mongoose.Types.ObjectId;
  classroomId: mongoose.Types.ObjectId;
  weekStart: string;
  status: DutyWeekStatus;
  selectedGroupId: string;
  selectionBasis: DutyGroupSelectionBasis;
  selectionNote: string;
  groupSnapshot: DutyWeek['groupSnapshot'];
  studentSnapshots: DutyWeek['studentSnapshots'];
  taskOccurrences: DutyWeek['taskOccurrences'];
  absences: DutyWeek['absences'];
  assignments: DutyWeek['assignments'];
  warnings: DutyWeek['warnings'];
  relaxedRules: string[];
  fairness: DutyWeek['fairness'];
  fairnessBaseline: DutyWeek['fairnessBaseline'];
  completionLedger: DutyWeek['completionLedger'];
  schedulerEngineVersion: string;
  generationRevision: number;
  generationContextHash: string | null;
  generationDataRevisions: DutyWeek['generationDataRevisions'];
  generationValidationSource: DutyWeek['generationValidationSource'];
  configurationRevision: number;
  requiresGeneration: boolean;
  publicationRevision: number;
  changeLog: DutyWeek['changeLog'];
  changeLogSummary: DutyWeek['changeLogSummary'];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const dutyWeekSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, required: true },
    classroomId: { type: Schema.Types.ObjectId, required: true },
    weekStart: { type: String, required: true },
    status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'COMPLETED'], required: true },
    selectedGroupId: { type: String, required: true },
    selectionBasis: {
      type: String,
      enum: ['MANUAL', 'ROTATION', 'LOWEST_RANKING', 'TEACHER_ASSIGNED', 'OTHER'],
      required: true,
    },
    selectionNote: { type: String, default: '' },
    groupSnapshot: { type: Schema.Types.Mixed, required: true },
    studentSnapshots: { type: [Schema.Types.Mixed], required: true, default: [] },
    taskOccurrences: { type: [Schema.Types.Mixed], required: true, default: [] },
    absences: { type: [Schema.Types.Mixed], required: true, default: [] },
    assignments: { type: [Schema.Types.Mixed], required: true, default: [] },
    warnings: { type: [Schema.Types.Mixed], required: true, default: [] },
    relaxedRules: { type: [String], required: true, default: [] },
    fairness: { type: Schema.Types.Mixed, default: null },
    fairnessBaseline: { type: [Schema.Types.Mixed], required: true, default: [] },
    completionLedger: { type: [Schema.Types.Mixed], required: true, default: [] },
    schedulerEngineVersion: { type: String, required: true },
    generationRevision: { type: Number, required: true, default: 0 },
    generationContextHash: { type: String, default: null },
    generationDataRevisions: { type: Schema.Types.Mixed, default: null },
    generationValidationSource: {
      type: String,
      enum: ['BACKEND_GENERATED', 'MANUAL_PREFLIGHT'],
      default: null,
    },
    configurationRevision: { type: Number, required: true, default: 0 },
    requiresGeneration: { type: Boolean, required: true, default: true },
    publicationRevision: { type: Number, required: true, default: 0 },
    changeLog: { type: [Schema.Types.Mixed], required: true, default: [] },
    changeLogSummary: { type: Schema.Types.Mixed, required: true },
  },
  {
    timestamps: true,
    versionKey: 'version',
    autoIndex: false,
    optimisticConcurrency: true,
    minimize: false,
  },
);

export const DutyWeekModel =
  (models.DutyWeek as Model<DutyWeekDocument> | undefined) ??
  model<DutyWeekDocument>('DutyWeek', dutyWeekSchema, 'dutyWeeks');
