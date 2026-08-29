import type {
  DateOnly,
  FairnessResult,
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
  readonly participationStart: DateOnly | null;
  readonly participationEnd: DateOnly | null;
  readonly restrictions: readonly StudentRestriction[];
}

export interface SchedulerSlot {
  readonly id: string;
  readonly index: number;
}
export interface SchedulerOccurrence {
  readonly id: string;
  readonly date: DateOnly;
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
  readonly date: DateOnly;
}
export interface ExistingAssignment {
  readonly slotId: string;
  readonly studentId: string;
  readonly source: 'AUTO' | 'MANUAL' | 'TEACHER_ASSIGNED';
  readonly locked: boolean;
}
export interface StudentHistoricalBaseline {
  readonly studentId: string;
  readonly aggregateActualPoints: number;
  readonly aggregateOpportunityPoints: number;
  readonly recentWeeks: readonly StudentRecentWeekSummary[];
}
export interface RecentTaskSummary {
  readonly taskFingerprint: string;
  readonly count: number;
  readonly lastPerformedDate: DateOnly;
}
export interface RecentPairingSummary {
  readonly studentId: string;
  readonly count: number;
}
export interface StudentRecentWeekSummary {
  readonly weekStart: DateOnly;
  readonly tasks: readonly RecentTaskSummary[];
  readonly dutyDates: readonly DateOnly[];
  readonly heavyDutyDates: readonly DateOnly[];
  readonly pairings: readonly RecentPairingSummary[];
}
export interface SchedulerInput {
  readonly weekStart: DateOnly;
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
  readonly source: 'AUTO' | 'MANUAL' | 'TEACHER_ASSIGNED';
  readonly locked: boolean;
  readonly reasonCodes: readonly string[];
}
export interface SchedulerWarning {
  readonly code:
    | 'UNASSIGNED_SLOT'
    | 'SAME_DAY_ASSIGNMENT_RELAXED'
    | 'RECENT_TASK_REPEAT_RELAXED'
    | 'CONSECUTIVE_DATES_RELAXED'
    | 'WORKLOAD_BALANCE_RELAXED';
  readonly slotId: string;
  readonly studentId: string | null;
}
export interface SchedulerOutput {
  readonly schedulerEngineVersion: string;
  readonly inputHash: string;
  readonly assignments: readonly GeneratedAssignment[];
  readonly unassignedSlotIds: readonly string[];
  readonly warnings: readonly SchedulerWarning[];
  readonly fairness: FairnessResult;
}
export interface ConstraintViolation {
  readonly code: string;
  readonly slotId?: string;
  readonly studentId?: string;
}

export interface CandidateScoreFacts {
  readonly normalizedHistoricalLoad: number;
  readonly currentWeekPoints: number;
  readonly recentTaskFrequency: number;
  readonly repeatedTaskPreviousWeek: boolean;
  readonly sameDayAssignmentCount: number;
  readonly sameDayAllLightweight: boolean;
  readonly recentHeavyDutyCount: number;
  readonly consecutiveDutyDate: boolean;
  readonly repeatedPairingCount: number;
  readonly softGenderMismatch: boolean;
  readonly taskRecentlyPerformed: boolean;
}

export interface CandidateScore {
  readonly studentId: string;
  readonly penalty: number;
  readonly requiredRelaxationLevel: 0 | 1 | 2 | 3 | 4;
  readonly facts: CandidateScoreFacts;
  readonly reasonCodes: readonly string[];
}

export interface ReplacementSuggestion extends CandidateScore {
  readonly explanations: readonly string[];
}
