import { z } from 'zod';

export const LoginRequestSchema = z.strictObject({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(8).max(256),
});
export const ChangePasswordRequestSchema = z.strictObject({
  currentPassword: z.string().min(8).max(256),
  newPassword: z.string().min(12).max(256),
});
export const AuthUserSchema = z.strictObject({
  id: z.string(),
  displayName: z.string(),
  username: z.string(),
  hasClassroom: z.boolean(),
  onboardingCompleted: z.boolean(),
});
export const AuthResponseSchema = z.strictObject({ data: AuthUserSchema });
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type AuthUser = z.infer<typeof AuthUserSchema>;
