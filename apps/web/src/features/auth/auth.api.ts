import type { AuthBootstrap, AuthLoginResult, AuthUser, Classroom } from '@lop-sach/contracts';
import { apiRequest } from '../../lib/api-client.js';
import { clearOfflineCache } from '../../lib/offline-cache.js';

export async function login(input: {
  readonly username: string;
  readonly password: string;
}): Promise<AuthLoginResult> {
  const response = await apiRequest<{
    readonly data: AuthUser & { readonly classroom?: Classroom | null };
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (response.data.classroom !== undefined)
    return { ...response.data, classroom: response.data.classroom };
  if (!response.data.hasClassroom) return { ...response.data, classroom: null };
  const classroom = (await apiRequest<{ readonly data: Classroom }>('/classroom')).data;
  return { ...response.data, classroom };
}
export async function getAuthBootstrap(): Promise<AuthBootstrap> {
  return (await apiRequest<{ readonly data: AuthBootstrap }>('/auth/bootstrap')).data;
}
export async function getCurrentUser(): Promise<AuthUser> {
  const response = await apiRequest<{ readonly data: AuthUser }>('/auth/me');
  return response.data;
}
export async function logout(): Promise<void> {
  try {
    await apiRequest('/auth/logout', { method: 'POST', body: '{}' });
  } finally {
    await clearOfflineCache();
  }
}
export async function changePassword(input: {
  readonly currentPassword: string;
  readonly newPassword: string;
}): Promise<void> {
  await apiRequest('/auth/change-password', { method: 'POST', body: JSON.stringify(input) });
}
