import type { Classroom, SchoolDay } from '@lop-sach/contracts';
import { apiRequest } from '../../lib/api-client.js';

interface ClassroomCreateInput {
  readonly name?: string;
  readonly schoolYear: string;
  readonly schoolDays?: readonly SchoolDay[];
}
interface ClassroomPatchInput {
  readonly name?: string;
  readonly schoolYear?: string;
  readonly schoolDays?: readonly SchoolDay[];
  readonly onboardingStep?: number;
  readonly completeOnboarding?: boolean;
  readonly expectedVersion: number;
}

export async function getClassroom(): Promise<Classroom> {
  return (await apiRequest<{ data: Classroom }>('/classroom')).data;
}
export async function createClassroom(input: ClassroomCreateInput): Promise<Classroom> {
  return (
    await apiRequest<{ data: Classroom }>('/classroom', {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  ).data;
}
export async function patchClassroom(input: ClassroomPatchInput): Promise<Classroom> {
  return (
    await apiRequest<{ data: Classroom }>('/classroom', {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  ).data;
}
export async function addGroup(input: {
  readonly name: string;
  readonly expectedVersion: number;
}): Promise<Classroom> {
  return (
    await apiRequest<{ data: Classroom }>('/classroom/groups', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  ).data;
}
export async function patchGroup(
  groupId: string,
  input: { readonly name?: string; readonly order?: number; readonly expectedVersion: number },
): Promise<Classroom> {
  return (
    await apiRequest<{ data: Classroom }>(`/classroom/groups/${encodeURIComponent(groupId)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  ).data;
}
export async function setGroupActive(
  groupId: string,
  active: boolean,
  expectedVersion: number,
): Promise<Classroom> {
  return (
    await apiRequest<{ data: Classroom }>(
      `/classroom/groups/${encodeURIComponent(groupId)}/${active ? 'activate' : 'deactivate'}`,
      { method: 'POST', body: JSON.stringify({ expectedVersion }) },
    )
  ).data;
}
