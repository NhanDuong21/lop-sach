import './setup.js';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { disconnectDatabase } from '../database/connect.js';
import { testApp } from './test-app.js';

describe('health', () => {
  it('reports live and ready without dependency details', async () => {
    await request(testApp()).get('/health/live').expect(200, { status: 'ok' });
    await request(testApp()).get('/health/ready').expect(200, { status: 'ready' });
  });

  it('keeps liveness safe and returns 503 while Atlas is unavailable', async () => {
    const app = testApp();
    await disconnectDatabase();
    await request(app).get('/health/live').expect(200, { status: 'ok' });
    const response = await request(app).get('/health/ready').expect(503);
    expect(response.body).toEqual({ status: 'unavailable', code: 'DEPENDENCY_UNAVAILABLE' });
  });
});
