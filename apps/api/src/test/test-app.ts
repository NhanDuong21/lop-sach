import type { Express } from 'express';
import { createApp } from '../app/create-app.js';
import type { AppConfig } from '../config/env.js';
import { hashPassword, normalizeUsername } from '../modules/auth/auth.service.js';
import { UserModel } from '../modules/auth/user.model.js';

export const TEST_PROXY_SECRET = 'test-proxy-secret-with-at-least-32-characters';

export function testConfig(environment: 'development' | 'test' | 'production' = 'test'): AppConfig {
  return {
    environment,
    port: 3000,
    mongoUri: 'mongodb://unused-by-app-factory',
    appOrigin: environment === 'production' ? 'https://lop-sach.test' : 'http://localhost:5173',
    logLevel: 'silent',
    ...(environment === 'production' ? { proxySecret: TEST_PROXY_SECRET } : {}),
  };
}

export function testApp(environment: 'development' | 'test' | 'production' = 'test'): Express {
  return createApp(testConfig(environment), { rateLimits: false });
}

export async function createTestOwner(): Promise<void> {
  await UserModel.create({
    username: 'owner',
    normalizedUsername: normalizeUsername('owner'),
    displayName: 'Lớp phó lao động',
    passwordHash: await hashPassword('mat-khau-thu-nghiem'),
    role: 'OWNER',
  });
}
