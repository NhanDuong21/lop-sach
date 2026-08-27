import './setup.js';
import request from 'supertest';
import { describe, it } from 'vitest';
import { testApp } from './test-app.js';

describe('health', () => {
  it('reports live and ready without dependency details', async () => {
    await request(testApp()).get('/health/live').expect(200, { status: 'ok' });
    await request(testApp()).get('/health/ready').expect(200, { status: 'ready' });
  });
});
