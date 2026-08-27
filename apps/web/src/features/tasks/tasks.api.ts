import type { TaskTemplate } from '@lop-sach/contracts';
import { apiRequest } from '../../lib/api-client.js';

export interface TaskWriteInput {
  readonly name: string;
  readonly schoolDays: readonly string[];
  readonly requiredStudents: number;
  readonly workloadLevel: 1 | 2 | 3 | 4;
  readonly eligibilityRule: 'ANY' | 'PREFER_MALE' | 'MALE_ONLY' | 'PREFER_FEMALE' | 'FEMALE_ONLY';
}
export async function listTasks(): Promise<readonly TaskTemplate[]> { return (await apiRequest<{ data: TaskTemplate[] }>('/task-templates')).data; }
export async function createTask(input: TaskWriteInput): Promise<TaskTemplate> { return (await apiRequest<{ data: TaskTemplate }>('/task-templates', { method: 'POST', body: JSON.stringify(input) })).data; }
export async function patchTask(taskId: string, input: Partial<TaskWriteInput> & { readonly expectedVersion: number }): Promise<TaskTemplate> { return (await apiRequest<{ data: TaskTemplate }>(`/task-templates/${encodeURIComponent(taskId)}`, { method: 'PATCH', body: JSON.stringify(input) })).data; }
export async function setTaskActive(taskId: string, active: boolean, expectedVersion: number): Promise<TaskTemplate> { return (await apiRequest<{ data: TaskTemplate }>(`/task-templates/${encodeURIComponent(taskId)}/${active ? 'activate' : 'deactivate'}`, { method: 'POST', body: JSON.stringify({ expectedVersion }) })).data; }
export async function reorderTasks(taskIds: readonly string[], expectedTasksRevision: number): Promise<readonly TaskTemplate[]> { return (await apiRequest<{ data: TaskTemplate[] }>('/task-templates/order', { method: 'PUT', body: JSON.stringify({ taskIds, expectedTasksRevision }) })).data; }
