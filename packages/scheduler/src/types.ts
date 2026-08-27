import type {
  StudentGender,
  StudentRestriction,
  TaskEligibilityRule,
  WorkloadLevel,
} from '@lop-sach/contracts';

export interface SchedulerStudent {
  readonly id: string;
  readonly groupId: string;
  readonly active: boolean;
  readonly gender: StudentGender;
  readonly participationStart: string | null;
  readonly participationEnd: string | null;
  readonly restrictions: readonly StudentRestriction[];
}

export interface SchedulerSlot {
  readonly id: string;
  readonly index: number;
}
export interface SchedulerOccurrence {
  readonly id: string;
  readonly date: string;
  readonly taskTemplateId: string | null;
  readonly taskFingerprint: string;
  readonly taskName: string;
  readonly workloadLevel: WorkloadLevel;
  readonly eligibilityRule: TaskEligibilityRule;
  readonly requiredStudents: number;
  readonly enabled: boolean;
  readonly order: number;
  readonly slots: readonly SchedulerSlot[];
}
export interface SchedulerAbsence {
  readonly studentId: string;
  readonly date: string;
}
export interface ExistingAssignment {
  readonly slotId: string;
  readonly studentId: string;
  readonly source: 'AUTO' | 'MANUAL';
  readonly locked: boolean;
}
export interface StudentHistoricalBaseline {
  readonly studentId: string;
  readonly aggregateActualPoints: number;
  readonly aggregateOpportunityPoints: number;
}
export interface SchedulerInput {
  readonly weekStart: string;
  readonly selectedGroupId: string;
  readonly students: readonly SchedulerStudent[];
  readonly occurrences: readonly SchedulerOccurrence[];
  readonly absences: readonly SchedulerAbsence[];
  readonly existingAssignments: readonly ExistingAssignment[];
  readonly historicalBaseline: readonly StudentHistoricalBaseline[];
}
export interface SchedulerDataRevisions {
  readonly classroomRevision: number;
  readonly studentRevisions: Readonly<Record<string, number>>;
  readonly taskRevisions: Readonly<Record<string, number>>;
  readonly weekConfigurationRevision: number;
}
export interface SchedulerContext {
  readonly schedulerEngineVersion: string;
  readonly generationRevision: number;
  readonly dataRevisions: SchedulerDataRevisions;
  readonly input: SchedulerInput;
}
export interface GeneratedAssignment {
  readonly slotId: string;
  readonly occurrenceId: string;
  readonly studentId: string;
  readonly source: 'AUTO' | 'MANUAL';
  readonly locked: boolean;
  readonly reasonCodes: readonly string[];
}
export interface SchedulerWarning {
  readonly code: 'UNASSIGNED_SLOT' | 'SAME_DAY_ASSIGNMENT_RELAXED';
  readonly slotId: string;
  readonly studentId: string | null;
}
export interface SchedulerOutput {
  readonly schedulerEngineVersion: string;
  readonly inputHash: string;
  readonly assignments: readonly GeneratedAssignment[];
  readonly unassignedSlotIds: readonly string[];
  readonly warnings: readonly SchedulerWarning[];
}
export interface ConstraintViolation {
  readonly code: string;
  readonly slotId?: string;
  readonly studentId?: string;
}
