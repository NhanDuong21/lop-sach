import './setup.js';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  AuthBootstrapResponseSchema,
  AuthLoginResponseSchema,
  AuthResponseSchema,
  ProblemDetailsSchema,
} from '@lop-sach/contracts';
import { SessionModel } from '../modules/auth/session.model.js';
import { createTestOwner, testApp } from './test-app.js';

beforeEach(createTestOwner);

describe('authentication lifecycle', () => {
  it('persists through me and revokes on logout', async () => {
    const app = testApp();
    const agent = request.agent(app);
    const login = await agent
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({ username: 'owner', password: 'mat-khau-thu-nghiem' })
      .expect(200);
    expect(AuthLoginResponseSchema.parse(login.body as unknown).data.classroom).toBeNull();
    const bootstrap = await agent.get('/api/v1/auth/bootstrap').expect(200);
    expect(AuthBootstrapResponseSchema.parse(bootstrap.body as unknown).data).toMatchObject({
      user: { username: 'owner', hasClassroom: false, onboardingCompleted: false },
      classroom: null,
    });
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

  it('returns the classroom in bootstrap and subsequent login responses', async () => {
    const app = testApp();
    const agent = request.agent(app);
    await agent
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({ username: 'owner', password: 'mat-khau-thu-nghiem' })
      .expect(200);
    await agent
      .put('/api/v1/classroom')
      .set('Origin', 'http://localhost:5173')
      .send({ name: '10C8', schoolYear: '2026-2027', schoolDays: ['MONDAY'] })
      .expect(201);
    const bootstrap = AuthBootstrapResponseSchema.parse(
      (await agent.get('/api/v1/auth/bootstrap').expect(200)).body as unknown,
    ).data;
    expect(bootstrap.user).toMatchObject({ hasClassroom: true, onboardingCompleted: false });
    expect(bootstrap.classroom).toMatchObject({ name: '10C8', schoolYear: '2026-2027' });

    await agent
      .post('/api/v1/auth/logout')
      .set('Origin', 'http://localhost:5173')
      .send({})
      .expect(204);
    const nextLogin = await agent
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({ username: 'owner', password: 'mat-khau-thu-nghiem' })
      .expect(200);
    expect(AuthLoginResponseSchema.parse(nextLogin.body as unknown).data.classroom).toMatchObject({
      name: '10C8',
      schoolYear: '2026-2027',
    });
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
