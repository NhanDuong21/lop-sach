import './setup.js';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestOwner, TEST_PROXY_SECRET, testApp } from './test-app.js';

beforeEach(createTestOwner);

describe('session cookie environments', () => {
  it('uses a non-Host cookie for local HTTP development', async () => {
    const response = await request(testApp('development'))
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({ username: 'owner', password: 'mat-khau-thu-nghiem' })
      .expect(200);
    const cookie = response.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toContain('lop_sach_session=');
    expect(cookie).not.toContain('__Host-');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).not.toContain('Secure');
    expect(cookie).not.toContain('Domain=');
  });

  it('uses the secure Host cookie in production', async () => {
    const response = await request(testApp('production'))
      .post('/api/v1/auth/login')
      .set('Origin', 'https://lop-sach.test')
      .set('X-Lop-Sach-Proxy-Secret', TEST_PROXY_SECRET)
      .send({ username: 'owner', password: 'mat-khau-thu-nghiem' })
      .expect(200);
    const cookie = response.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toContain('__Host-lop_sach_session=');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).not.toContain('Domain=');
  });
});
