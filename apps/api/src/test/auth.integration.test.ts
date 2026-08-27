import './setup.js';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthResponseSchema, ProblemDetailsSchema } from '@lop-sach/contracts';
import { SessionModel } from '../modules/auth/session.model.js';
import { createTestOwner, testApp } from './test-app.js';

beforeEach(createTestOwner);

describe('authentication lifecycle', () => {
  it('persists through me and revokes on logout', async () => {
    const app = testApp();
    const agent = request.agent(app);
    await agent
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({ username: 'owner', password: 'mat-khau-thu-nghiem' })
      .expect(200);
    const me = await agent.get('/api/v1/auth/me').expect(200);
    expect(AuthResponseSchema.parse(me.body as unknown).data.username).toBe('owner');
    await agent
      .post('/api/v1/auth/logout')
      .set('Origin', 'http://localhost:5173')
      .send({})
      .expect(204);
    await agent.get('/api/v1/auth/me').expect(401);
    expect(await SessionModel.countDocuments()).toBe(0);
  });

  it('rejects an incorrect Origin', async () => {
    await request(testApp())
      .post('/api/v1/auth/login')
      .set('Origin', 'https://attacker.invalid')
      .send({ username: 'owner', password: 'mat-khau-thu-nghiem' })
      .expect(403);
  });

  it('returns a generic credential error', async () => {
    const response = await request(testApp())
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({ username: 'missing', password: 'mat-khau-khong-dung' })
      .expect(401);
    expect(ProblemDetailsSchema.parse(response.body as unknown).code).toBe('INVALID_CREDENTIALS');
  });
});
