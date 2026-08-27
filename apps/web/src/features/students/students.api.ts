import type { Student } from '@lop-sach/contracts';
import { apiRequest } from '../../lib/api-client.js';

export interface StudentWriteInput {
  readonly displayName: string;
  readonly groupId: string;
  readonly active?: boolean;
  readonly gender?: 'MALE' | 'FEMALE' | 'UNSPECIFIED';
  readonly participationStart?: string | null;
  readonly participationEnd?: string | null;
  readonly restrictions?: readonly Record<string, unknown>[];
}
interface StudentPatchInput {
  readonly displayName: string;
  readonly gender?: 'MALE' | 'FEMALE' | 'UNSPECIFIED' | undefined;
  readonly participationStart?: string | null | undefined;
  readonly participationEnd?: string | null | undefined;
  readonly restrictions?: readonly Record<string, unknown>[] | undefined;
  readonly expectedVersion: number;
}
export async function listStudents(): Promise<readonly Student[]> {
  return (await apiRequest<{ data: Student[] }>('/students')).data;
}
export async function createStudent(input: StudentWriteInput): Promise<Student> {
  return (
    await apiRequest<{ data: Student }>('/students', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  ).data;
}
export async function patchStudent(studentId: string, input: StudentPatchInput): Promise<Student> {
  return (
    await apiRequest<{ data: Student }>(`/students/${encodeURIComponent(studentId)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  ).data;
}
export async function moveStudent(
  studentId: string,
  groupId: string,
  expectedVersion: number,
): Promise<Student> {
  return (
    await apiRequest<{ data: Student }>(`/students/${encodeURIComponent(studentId)}/move`, {
      method: 'POST',
      body: JSON.stringify({ groupId, expectedVersion }),
    })
  ).data;
}
export async function setStudentActive(
  studentId: string,
  active: boolean,
  expectedVersion: number,
): Promise<Student> {
  return (
    await apiRequest<{ data: Student }>(
      `/students/${encodeURIComponent(studentId)}/${active ? 'activate' : 'deactivate'}`,
      { method: 'POST', body: JSON.stringify({ expectedVersion }) },
    )
  ).data;
}
