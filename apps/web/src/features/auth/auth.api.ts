import type { AuthUser } from '@lop-sach/contracts';
import { apiRequest } from '../../lib/api-client.js';

export async function login(input: { readonly username: string; readonly password: string }): Promise<AuthUser> {
  const response = await apiRequest<{ readonly data: AuthUser }>('/auth/login', { method: 'POST', body: JSON.stringify(input) });
  return response.data;
}
export async function getCurrentUser(): Promise<AuthUser> {
  const response = await apiRequest<{ readonly data: AuthUser }>('/auth/me');
  return response.data;
}
export async function logout(): Promise<void> { await apiRequest('/auth/logout', { method: 'POST', body: '{}' }); }
export async function changePassword(input: { readonly currentPassword: string; readonly newPassword: string }): Promise<void> { await apiRequest('/auth/change-password', { method: 'POST', body: JSON.stringify(input) }); }
