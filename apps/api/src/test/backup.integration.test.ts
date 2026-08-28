import './setup.js';
import {
  BackupEnvelopeSchema,
  BackupValidationResultSchema,
  ClassroomSchema,
  DutyWeekSchema,
  HistoryMetricSchema,
  HistorySummaryItemSchema,
  type Classroom,
  type DutyWeek,
} from '@lop-sach/contracts';
import request from 'supertest';
import { z } from 'zod';
import { beforeEach, describe, expect, it } from 'vitest';
import { SessionModel } from '../modules/auth/session.model.js';
import { UserModel } from '../modules/auth/user.model.js';
import { StudentModel } from '../modules/students/student.model.js';
import { createTestOwner, testApp } from './test-app.js';

type TestAgent = ReturnType<typeof request.agent>;
const ClassroomEnvelopeSchema = z.strictObject({ data: ClassroomSchema });
const WeekEnvelopeSchema = z.strictObject({ data: DutyWeekSchema });

beforeEach(createTestOwner);

async function authenticatedAgent(): Promise<TestAgent> {
  const agent = request.agent(testApp());
  await agent
    .post('/api/v1/auth/login')
    .set('Origin', 'http://localhost:5173')
    .send({ username: 'owner', password: 'mat-khau-thu-nghiem' })
    .expect(200);
  return agent;
}

async function completedWeek(agent: TestAgent): Promise<{ classroom: Classroom; week: DutyWeek }> {
  const classroom = ClassroomEnvelopeSchema.parse(
    (
      await agent
        .put('/api/v1/classroom')
        .set('Origin', 'http://localhost:5173')
        .send({ name: '10C8', schoolYear: '2026-2027', schoolDays: ['MONDAY'] })
        .expect(201)
    ).body as unknown,
  ).data;
  const groupId = classroom.groups[0]?.id ?? '';
  for (const displayName of ['An', 'Bình', 'Chi', 'Dũng']) {
    await agent
      .post('/api/v1/students')
      .set('Origin', 'http://localhost:5173')
      .send({ displayName, groupId, active: true, gender: 'UNSPECIFIED', restrictions: [] })
      .expect(201);
  }
  let week = WeekEnvelopeSchema.parse(
    (
      await agent
        .post('/api/v1/duty-weeks')
        .set('Origin', 'http://localhost:5173')
        .send({ weekStart: '2026-08-24', selectedGroupId: groupId, selectionBasis: 'MANUAL' })
        .expect(201)
    ).body as unknown,
  ).data;
  const context = (await agent.get(`/api/v1/duty-weeks/${week.id}/generation-context`).expect(200))
    .body as { data: { inputHash: string; serverSchedulerEngineVersion: string } };
  week = WeekEnvelopeSchema.parse(
    (
      await agent
        .post(`/api/v1/duty-weeks/${week.id}/generate`)
        .set('Origin', 'http://localhost:5173')
        .send({
          expectedVersion: week.version,
          inputHash: context.data.inputHash,
          clientSchedulerEngineVersion: context.data.serverSchedulerEngineVersion,
        })
        .expect(200)
    ).body as unknown,
  ).data;
  week = WeekEnvelopeSchema.parse(
    (
      await agent
        .post(`/api/v1/duty-weeks/${week.id}/publish`)
        .set('Origin', 'http://localhost:5173')
        .send({ expectedVersion: week.version })
        .expect(200)
    ).body as unknown,
  ).data;
  week = WeekEnvelopeSchema.parse(
    (
      await agent
        .post(`/api/v1/duty-weeks/${week.id}/complete`)
        .set('Origin', 'http://localhost:5173')
        .send({ expectedVersion: week.version, actualPerformers: [] })
        .expect(200)
    ).body as unknown,
  ).data;
  return { classroom, week };
}

describe('history and backup', () => {
  it('aggregates completed ledgers while retaining snapshot names', async () => {
    const agent = await authenticatedAgent();
    const { classroom, week } = await completedWeek(agent);
    const currentClassroom = ClassroomEnvelopeSchema.parse(
      (await agent.get('/api/v1/classroom').expect(200)).body as unknown,
    ).data;
    await agent
      .patch(`/api/v1/classroom/groups/${classroom.groups[0]?.id ?? ''}`)
      .set('Origin', 'http://localhost:5173')
      .send({ name: 'Tổ đã đổi tên', expectedVersion: currentClassroom.version })
      .expect(200);
    const summary = z
      .strictObject({ data: z.array(HistorySummaryItemSchema) })
      .parse((await agent.get('/api/v1/history/summary').expect(200)).body as unknown).data;
    expect(summary).toHaveLength(1);
    expect(summary[0]).toMatchObject({
      id: week.id,
      weekStart: '2026-08-24',
      groupId: classroom.groups[0]?.id,
      groupName: 'Tổ 1',
      status: 'COMPLETED',
      usedAssignedPerformerFallback: true,
    });
    const metrics = z
      .strictObject({ data: z.array(HistoryMetricSchema) })
      .parse((await agent.get('/api/v1/history/metrics').expect(200)).body as unknown).data;
    expect(metrics).toHaveLength(4);
    expect(metrics.every((item) => item.groupId === classroom.groups[0]?.id)).toBe(true);
    expect(metrics.every((item) => item.groupName === 'Tổ 1')).toBe(true);
    expect(metrics.map((item) => item.studentDisplayName)).toEqual(['An', 'Bình', 'Chi', 'Dũng']);
    expect(metrics.reduce((total, item) => total + item.actualPoints, 0)).toBeGreaterThan(0);
  });

  it('exports only domain data and restores a validated digest transactionally', async () => {
    const agent = await authenticatedAgent();
    const { classroom } = await completedWeek(agent);
    const exportedResponse = await agent.get('/api/v1/backup/export').expect(200);
    expect(exportedResponse.headers['cache-control']).toBe('no-store');
    expect(exportedResponse.headers['content-disposition']).toContain('lop-sach-backup-');
    const backup = BackupEnvelopeSchema.parse((exportedResponse.body as { data: unknown }).data);
    const serialized = JSON.stringify(backup);
    const owner = await UserModel.findOne();
    expect(serialized).not.toContain('passwordHash');
    expect(serialized).not.toContain('tokenHash');
    expect(serialized).not.toContain('schemaMigrations');
    expect(serialized).not.toContain(String(owner?._id));

    const validationResponse = await agent
      .post('/api/v1/backup/validate')
      .set('Origin', 'http://localhost:5173')
      .send({ backup })
      .expect(200);
    const validation = BackupValidationResultSchema.parse(
      (validationResponse.body as { data: unknown }).data,
    );
    expect(validation).toMatchObject({ studentCount: 4, taskTemplateCount: 3, dutyWeekCount: 1 });

    const changedClassroom = ClassroomEnvelopeSchema.parse(
      (
        await agent
          .patch('/api/v1/classroom')
          .set('Origin', 'http://localhost:5173')
          .send({ name: 'Tên tạm', expectedVersion: classroom.version + 4 })
          .expect(200)
      ).body as unknown,
    ).data;
    await agent
      .post('/api/v1/students')
      .set('Origin', 'http://localhost:5173')
      .send({
        displayName: 'Học sinh tạm',
        groupId: changedClassroom.groups[0]?.id,
        active: true,
        gender: 'UNSPECIFIED',
        restrictions: [],
      })
      .expect(201);
    const userCount = await UserModel.countDocuments();
    const sessionCount = await SessionModel.countDocuments();

    await agent
      .post('/api/v1/backup/restore')
      .set('Origin', 'http://localhost:5173')
      .send({ backup, confirmedDigest: '0'.repeat(64) })
      .expect(409);
    expect(await StudentModel.countDocuments()).toBe(5);

    await agent
      .post('/api/v1/backup/restore')
      .set('Origin', 'http://localhost:5173')
      .send({ backup, confirmedDigest: validation.digest })
      .expect(200);
    expect(await StudentModel.countDocuments()).toBe(4);
    expect(await UserModel.countDocuments()).toBe(userCount);
    expect(await SessionModel.countDocuments()).toBe(sessionCount);
    expect(
      ClassroomEnvelopeSchema.parse(
        (await agent.get('/api/v1/classroom').expect(200)).body as unknown,
      ).data.name,
    ).toBe('10C8');
  });

  it('rejects an envelope with auth-like extra fields before any write', async () => {
    const agent = await authenticatedAgent();
    await completedWeek(agent);
    const backup = BackupEnvelopeSchema.parse(
      ((await agent.get('/api/v1/backup/export').expect(200)).body as { data: unknown }).data,
    );
    const before = await StudentModel.countDocuments();
    await agent
      .post('/api/v1/backup/validate')
      .set('Origin', 'http://localhost:5173')
      .send({ backup: { ...backup, sessions: [{ tokenHash: 'secret' }] } })
      .expect(422);
    expect(await StudentModel.countDocuments()).toBe(before);
  });
});
