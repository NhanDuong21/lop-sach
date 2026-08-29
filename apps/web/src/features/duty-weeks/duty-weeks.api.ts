import type {
  CompletionOptions,
  DutyGroupSelectionBasis,
  DutyWeek,
  DutyWeekOverview,
  TaskEligibilityRule,
  WorkloadLevel,
} from '@lop-sach/contracts';
import type { ReplacementSuggestion, SchedulerContext } from '@lop-sach/scheduler';
import { apiRequest } from '../../lib/api-client.js';

export interface GenerationContextResponse {
  readonly context: SchedulerContext;
  readonly inputHash: string;
  readonly dataRevisions: SchedulerContext['dataRevisions'];
  readonly serverSchedulerEngineVersion: string;
}

export async function listDutyWeeks(
  filters: {
    readonly status?: DutyWeek['status'];
    readonly from?: string;
    readonly to?: string;
  } = {},
): Promise<readonly DutyWeek[]> {
  const query = new URLSearchParams();
  if (filters.status) query.set('status', filters.status);
  if (filters.from) query.set('from', filters.from);
  if (filters.to) query.set('to', filters.to);
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return (await apiRequest<{ data: DutyWeek[] }>(`/duty-weeks${suffix}`)).data;
}

export async function getDutyWeekOverview(weekStart: string): Promise<DutyWeekOverview> {
  const query = new URLSearchParams({ weekStart });
  return (await apiRequest<{ data: DutyWeekOverview }>(`/duty-weeks/overview?${query.toString()}`))
    .data;
}

export async function getDutyWeek(weekId: string): Promise<DutyWeek> {
  return (await apiRequest<{ data: DutyWeek }>(`/duty-weeks/${encodeURIComponent(weekId)}`)).data;
}

export async function deleteDutyWeek(weekId: string, expectedVersion: number): Promise<void> {
  await apiRequest<void>(`/duty-weeks/${encodeURIComponent(weekId)}`, {
    method: 'DELETE',
    body: JSON.stringify({ expectedVersion }),
  });
}

export async function createDutyWeek(input: {
  readonly weekStart: string;
  readonly selectedGroupId: string;
  readonly selectionBasis: DutyGroupSelectionBasis;
  readonly selectionNote: string;
}): Promise<DutyWeek> {
  return (
    await apiRequest<{ data: DutyWeek }>('/duty-weeks', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  ).data;
}

export async function patchDutyWeek(
  weekId: string,
  input: {
    readonly selectedGroupId?: string;
    readonly selectionBasis?: DutyGroupSelectionBasis;
    readonly selectionNote?: string;
    readonly expectedVersion: number;
  },
): Promise<DutyWeek> {
  return (
    await apiRequest<{ data: DutyWeek }>(`/duty-weeks/${encodeURIComponent(weekId)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  ).data;
}

export async function replaceAbsences(
  weekId: string,
  absences: DutyWeek['absences'],
  expectedVersion: number,
): Promise<DutyWeek> {
  return (
    await apiRequest<{ data: DutyWeek }>(`/duty-weeks/${encodeURIComponent(weekId)}/absences`, {
      method: 'PUT',
      body: JSON.stringify({ absences, expectedVersion }),
    })
  ).data;
}

export async function createOneOff(
  weekId: string,
  input: {
    readonly date: string;
    readonly taskName: string;
    readonly workloadLevel: WorkloadLevel;
    readonly eligibilityRule: TaskEligibilityRule;
    readonly requiredStudents: number;
    readonly enabled: boolean;
    readonly expectedVersion: number;
  },
): Promise<DutyWeek> {
  return (
    await apiRequest<{ data: DutyWeek }>(
      `/duty-weeks/${encodeURIComponent(weekId)}/task-occurrences`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    )
  ).data;
}

export async function patchOccurrence(
  weekId: string,
  occurrenceId: string,
  input: { readonly enabled?: boolean; readonly expectedVersion: number },
): Promise<DutyWeek> {
  return (
    await apiRequest<{ data: DutyWeek }>(
      `/duty-weeks/${encodeURIComponent(weekId)}/task-occurrences/${encodeURIComponent(occurrenceId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    )
  ).data;
}

export async function deleteOccurrence(
  weekId: string,
  occurrenceId: string,
  expectedVersion: number,
): Promise<DutyWeek> {
  return (
    await apiRequest<{ data: DutyWeek }>(
      `/duty-weeks/${encodeURIComponent(weekId)}/task-occurrences/${encodeURIComponent(occurrenceId)}`,
      {
        method: 'DELETE',
        body: JSON.stringify({ expectedVersion }),
      },
    )
  ).data;
}

export async function getGenerationContext(weekId: string): Promise<GenerationContextResponse> {
  return (
    await apiRequest<{ data: GenerationContextResponse }>(
      `/duty-weeks/${encodeURIComponent(weekId)}/generation-context`,
    )
  ).data;
}

export async function generateDutyWeek(
  weekId: string,
  input: {
    readonly expectedVersion: number;
    readonly clientSchedulerEngineVersion: string;
    readonly inputHash: string;
  },
): Promise<DutyWeek> {
  return (
    await apiRequest<{ data: DutyWeek }>(`/duty-weeks/${encodeURIComponent(weekId)}/generate`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  ).data;
}

async function versionedMutation(
  weekId: string,
  action: 'preflight' | 'publish',
  expectedVersion: number,
): Promise<DutyWeek> {
  return (
    await apiRequest<{ data: DutyWeek }>(`/duty-weeks/${encodeURIComponent(weekId)}/${action}`, {
      method: 'POST',
      body: JSON.stringify({ expectedVersion }),
    })
  ).data;
}

export const preflightDutyWeek = (weekId: string, expectedVersion: number): Promise<DutyWeek> =>
  versionedMutation(weekId, 'preflight', expectedVersion);
export const publishDutyWeek = (weekId: string, expectedVersion: number): Promise<DutyWeek> =>
  versionedMutation(weekId, 'publish', expectedVersion);

export async function completeDutyWeek(
  weekId: string,
  expectedVersion: number,
  actualPerformers: readonly { readonly slotId: string; readonly studentId: string }[],
): Promise<DutyWeek> {
  return (
    await apiRequest<{ data: DutyWeek }>(`/duty-weeks/${encodeURIComponent(weekId)}/complete`, {
      method: 'POST',
      body: JSON.stringify({ expectedVersion, actualPerformers }),
    })
  ).data;
}

export async function getCompletionOptions(weekId: string): Promise<CompletionOptions> {
  return (
    await apiRequest<{ data: CompletionOptions }>(
      `/duty-weeks/${encodeURIComponent(weekId)}/completion-options`,
    )
  ).data;
}

export async function writeAssignment(
  weekId: string,
  slotId: string,
  studentId: string | null,
  expectedVersion: number,
): Promise<DutyWeek> {
  return (
    await apiRequest<{ data: DutyWeek }>(
      `/duty-weeks/${encodeURIComponent(weekId)}/slots/${encodeURIComponent(slotId)}/assignment`,
      {
        method: 'PUT',
        body: JSON.stringify({ studentId, expectedVersion }),
      },
    )
  ).data;
}

export async function setAssignmentLock(
  weekId: string,
  slotId: string,
  locked: boolean,
  expectedVersion: number,
): Promise<DutyWeek> {
  return (
    await apiRequest<{ data: DutyWeek }>(
      `/duty-weeks/${encodeURIComponent(weekId)}/slots/${encodeURIComponent(slotId)}/lock`,
      {
        method: 'PATCH',
        body: JSON.stringify({ locked, expectedVersion }),
      },
    )
  ).data;
}

export async function getReplacementSuggestions(
  weekId: string,
  slotId: string,
): Promise<readonly ReplacementSuggestion[]> {
  return (
    await apiRequest<{ data: ReplacementSuggestion[] }>(
      `/duty-weeks/${encodeURIComponent(weekId)}/slots/${encodeURIComponent(slotId)}/replacements`,
    )
  ).data;
}

export async function replaceAssignment(
  weekId: string,
  slotId: string,
  studentId: string,
  expectedVersion: number,
): Promise<DutyWeek> {
  return (
    await apiRequest<{ data: DutyWeek }>(
      `/duty-weeks/${encodeURIComponent(weekId)}/slots/${encodeURIComponent(slotId)}/replace`,
      {
        method: 'POST',
        body: JSON.stringify({ studentId, expectedVersion }),
      },
    )
  ).data;
}

export async function swapAssignments(
  weekId: string,
  firstSlotId: string,
  secondSlotId: string,
  expectedVersion: number,
): Promise<DutyWeek> {
  return (
    await apiRequest<{ data: DutyWeek }>(
      `/duty-weeks/${encodeURIComponent(weekId)}/assignments/swap`,
      {
        method: 'POST',
        body: JSON.stringify({ firstSlotId, secondSlotId, expectedVersion }),
      },
    )
  ).data;
}
