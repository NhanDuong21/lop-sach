import './setup.js';
import {
  ClassroomSchema,
  CompletionOptionsSchema,
  DutyWeekSchema,
  DutyWeekOverviewSchema,
  ProblemDetailsSchema,
  StudentSchema,
  type Classroom,
  type DutyWeek,
  type Student,
} from '@lop-sach/contracts';
import request from 'supertest';
import { z } from 'zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DutyWeekModel } from '../modules/duty-weeks/duty-week.model.js';
import { createTestOwner, testApp } from './test-app.js';

type TestAgent = ReturnType<typeof request.agent>;
const ClassroomEnvelopeSchema = z.strictObject({ data: ClassroomSchema });
const StudentEnvelopeSchema = z.strictObject({ data: StudentSchema });
const WeekEnvelopeSchema = z.strictObject({ data: DutyWeekSchema });
const WeekOverviewEnvelopeSchema = z.strictObject({ data: DutyWeekOverviewSchema });
const CompletionOptionsEnvelopeSchema = z.strictObject({ data: CompletionOptionsSchema });

const vietnamClock = vi.hoisted(() => ({ today: '2026-08-28' }));
vi.mock('../shared/date-time.js', () => ({
  currentDateInVietnam: () => vietnamClock.today,
}));

beforeEach(async () => {
  vietnamClock.today = '2026-08-28';
  await createTestOwner();
});

async function authenticatedAgent(): Promise<TestAgent> {
  const agent = request.agent(testApp());
  await agent
    .post('/api/v1/auth/login')
    .set('Origin', 'http://localhost:5173')
    .send({ username: 'owner', password: 'mat-khau-thu-nghiem' })
    .expect(200);
  return agent;
}

async function classroomWithStudents(
  agent: TestAgent,
  schoolDays: Classroom['schoolDays'] = ['MONDAY'],
): Promise<{
  readonly classroom: Classroom;
  readonly students: readonly Student[];
}> {
  const classroomResponse = await agent
    .put('/api/v1/classroom')
    .set('Origin', 'http://localhost:5173')
    .send({
      name: '10C8',
      schoolYear: '2026-2027',
      schoolDays,
    })
    .expect(201);
  const classroom = ClassroomEnvelopeSchema.parse(classroomResponse.body as unknown).data;
  const groupId = classroom.groups[0]?.id ?? '';
  const students: Student[] = [];
  for (const [index, displayName] of ['An', 'Bình', 'Chi', 'Dũng'].entries()) {
    const response = await agent
      .post('/api/v1/students')
      .set('Origin', 'http://localhost:5173')
      .send({
        displayName,
        groupId,
        active: true,
        gender: 'UNSPECIFIED',
        restrictions: index === 0 ? [{ type: 'NO_HEAVY_TASKS' }] : [],
      })
      .expect(201);
    students.push(StudentEnvelopeSchema.parse(response.body as unknown).data);
  }
  return { classroom, students };
}

async function createWeek(agent: TestAgent, classroom: Classroom): Promise<DutyWeek> {
  const response = await agent
    .post('/api/v1/duty-weeks')
    .set('Origin', 'http://localhost:5173')
    .send({
      weekStart: '2026-08-24',
      selectedGroupId: classroom.groups[0]?.id,
      selectionBasis: 'MANUAL',
      selectionNote: 'Tuần kiểm thử',
    })
    .expect(201);
  return WeekEnvelopeSchema.parse(response.body as unknown).data;
}

async function generateWeek(agent: TestAgent, week: DutyWeek): Promise<DutyWeek> {
  const contextResponse = await agent
    .get(`/api/v1/duty-weeks/${week.id}/generation-context`)
    .expect(200);
  const context = z
    .strictObject({
      data: z.strictObject({
        inputHash: z.string(),
        serverSchedulerEngineVersion: z.string(),
        context: z.unknown(),
        dataRevisions: z.unknown(),
        fairnessBaseline: z.unknown(),
      }),
    })
    .parse(contextResponse.body as unknown).data;
  const response = await agent
    .post(`/api/v1/duty-weeks/${week.id}/generate`)
    .set('Origin', 'http://localhost:5173')
    .send({
      expectedVersion: week.version,
      clientSchedulerEngineVersion: context.serverSchedulerEngineVersion,
      inputHash: context.inputHash,
    });
  if (response.status !== 200) throw new Error(JSON.stringify(response.body));
  return WeekEnvelopeSchema.parse(response.body as unknown).data;
}

describe('duty-week lifecycle', () => {
  it('returns the current week and all resumable drafts in one overview request', async () => {
    const agent = await authenticatedAgent();
    const { classroom } = await classroomWithStudents(agent);
    const draft = await createWeek(agent, classroom);

    const overview = WeekOverviewEnvelopeSchema.parse(
      (
        await agent
          .get('/api/v1/duty-weeks/overview')
          .query({ weekStart: '2026-08-24' })
          .expect(200)
      ).body as unknown,
    ).data;
    expect(overview.currentWeek?.id).toBe(draft.id);
    expect(overview.draftWeeks.map((week) => week.id)).toEqual([draft.id]);

    const futureOverview = WeekOverviewEnvelopeSchema.parse(
      (
        await agent
          .get('/api/v1/duty-weeks/overview')
          .query({ weekStart: '2026-09-07' })
          .expect(200)
      ).body as unknown,
    ).data;
    expect(futureOverview.currentWeek).toBeNull();
    expect(futureOverview.draftWeeks.map((week) => week.id)).toEqual([draft.id]);
  });

  it('deletes a version-matched draft, frees its week and protects published schedules', async () => {
    const agent = await authenticatedAgent();
    const { classroom } = await classroomWithStudents(agent);
    const draft = await createWeek(agent, classroom);

    const staleDelete = await agent
      .delete(`/api/v1/duty-weeks/${draft.id}`)
      .set('Origin', 'http://localhost:5173')
      .send({ expectedVersion: draft.version + 1 })
      .expect(409);
    expect(ProblemDetailsSchema.parse(staleDelete.body as unknown).code).toBe('VERSION_CONFLICT');
    await agent.get(`/api/v1/duty-weeks/${draft.id}`).expect(200);

    await agent
      .delete(`/api/v1/duty-weeks/${draft.id}`)
      .set('Origin', 'http://localhost:5173')
      .send({ expectedVersion: draft.version })
      .expect(204);
    await agent.get(`/api/v1/duty-weeks/${draft.id}`).expect(404);

    const recreated = await createWeek(agent, classroom);
    const generated = await generateWeek(agent, recreated);
    const publishedResponse = await agent
      .post(`/api/v1/duty-weeks/${generated.id}/publish`)
      .set('Origin', 'http://localhost:5173')
      .send({ expectedVersion: generated.version })
      .expect(200);
    const published = WeekEnvelopeSchema.parse(publishedResponse.body as unknown).data;
    const publishedDelete = await agent
      .delete(`/api/v1/duty-weeks/${published.id}`)
      .set('Origin', 'http://localhost:5173')
      .send({ expectedVersion: published.version })
      .expect(409);
    expect(ProblemDetailsSchema.parse(publishedDelete.body as unknown).code).toBe(
      'INVALID_WEEK_TRANSITION',
    );
  });

  it('blocks completion before the last duty date and allows it on that date', async () => {
    const agent = await authenticatedAgent();
    const { classroom } = await classroomWithStudents(agent, ['SATURDAY']);
    const draft = await createWeek(agent, classroom);
    const generated = await generateWeek(agent, draft);
    const published = WeekEnvelopeSchema.parse(
      (
        await agent
          .post(`/api/v1/duty-weeks/${draft.id}/publish`)
          .set('Origin', 'http://localhost:5173')
          .send({ expectedVersion: generated.version })
          .expect(200)
      ).body as unknown,
    ).data;

    const blocked = await agent
      .post(`/api/v1/duty-weeks/${draft.id}/complete`)
      .set('Origin', 'http://localhost:5173')
      .send({ expectedVersion: published.version, actualPerformers: [] })
      .expect(409);
    expect(ProblemDetailsSchema.parse(blocked.body as unknown)).toMatchObject({
      code: 'WEEK_COMPLETION_TOO_EARLY',
      detail: 'Chưa thể hoàn thành tuần. Tuần trực còn công việc vào Thứ Bảy, 29/08/2026.',
    });

    vietnamClock.today = '2026-08-29';
    const completed = WeekEnvelopeSchema.parse(
      (
        await agent
          .post(`/api/v1/duty-weeks/${draft.id}/complete`)
          .set('Origin', 'http://localhost:5173')
          .send({ expectedVersion: published.version, actualPerformers: [] })
          .expect(200)
      ).body as unknown,
    ).data;
    expect(completed.status).toBe('COMPLETED');
  });

  it('generates canonically, publishes once and completes an immutable ledger', async () => {
    const agent = await authenticatedAgent();
    const { classroom } = await classroomWithStudents(agent);
    const draft = await createWeek(agent, classroom);
    expect(draft.taskOccurrences).toHaveLength(3);
    expect(draft.assignments).toEqual([]);
    expect(draft.requiresGeneration).toBe(true);

    const context = (
      await agent.get(`/api/v1/duty-weeks/${draft.id}/generation-context`).expect(200)
    ).body as {
      data: { inputHash: string };
    };
    const outdated = await agent
      .post(`/api/v1/duty-weeks/${draft.id}/generate`)
      .set('Origin', 'http://localhost:5173')
      .send({
        expectedVersion: draft.version,
        clientSchedulerEngineVersion: '0.9.0',
        inputHash: context.data.inputHash,
      })
      .expect(409);
    expect(ProblemDetailsSchema.parse(outdated.body as unknown)).toMatchObject({
      code: 'SCHEDULER_VERSION_OUTDATED',
      action: 'RELOAD_REQUIRED',
      serverSchedulerEngineVersion: '1.1.0',
    });

    const generated = await generateWeek(agent, draft);
    expect(generated.assignments).toHaveLength(4);
    expect(generated.generationContextHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(generated.requiresGeneration).toBe(false);
    expect(generated.fairness).not.toBeNull();

    const publishedResponse = await agent
      .post(`/api/v1/duty-weeks/${draft.id}/publish`)
      .set('Origin', 'http://localhost:5173')
      .send({ expectedVersion: generated.version })
      .expect(200);
    const published = WeekEnvelopeSchema.parse(publishedResponse.body as unknown).data;
    expect(published.status).toBe('PUBLISHED');
    expect(published.publicationRevision).toBe(1);
    const completionOptions = CompletionOptionsEnvelopeSchema.parse(
      (await agent.get(`/api/v1/duty-weeks/${draft.id}/completion-options`).expect(200))
        .body as unknown,
    ).data;
    expect(completionOptions).toHaveLength(published.assignments.length);
    expect(completionOptions.every((item) => item.students.length > 0)).toBe(true);
    await agent
      .post(`/api/v1/duty-weeks/${draft.id}/generate`)
      .set('Origin', 'http://localhost:5173')
      .send({
        expectedVersion: published.version,
        clientSchedulerEngineVersion: '1.0.0',
        inputHash: generated.generationContextHash,
      })
      .expect(409);

    const completedResponse = await agent
      .post(`/api/v1/duty-weeks/${draft.id}/complete`)
      .set('Origin', 'http://localhost:5173')
      .send({ expectedVersion: published.version, actualPerformers: [] })
      .expect(200);
    const completed = WeekEnvelopeSchema.parse(completedResponse.body as unknown).data;
    expect(completed.status).toBe('COMPLETED');
    expect(completed.completionLedger).toHaveLength(4);
    expect(completed.assignments.every((assignment) => assignment.actualStudentId !== null)).toBe(
      true,
    );
    await agent
      .patch(`/api/v1/duty-weeks/${draft.id}`)
      .set('Origin', 'http://localhost:5173')
      .send({ selectionNote: 'Không được đổi', expectedVersion: completed.version })
      .expect(409);
  });

  it('detects master-data staleness before publish and requires regeneration', async () => {
    const agent = await authenticatedAgent();
    const { classroom, students } = await classroomWithStudents(agent);
    const draft = await createWeek(agent, classroom);
    const generated = await generateWeek(agent, draft);
    const student = students[0]!;
    await agent
      .patch(`/api/v1/students/${student.id}`)
      .set('Origin', 'http://localhost:5173')
      .send({ displayName: 'An đã sửa', expectedVersion: student.version })
      .expect(200);

    const stale = WeekEnvelopeSchema.parse(
      (await agent.get(`/api/v1/duty-weeks/${draft.id}`).expect(200)).body as unknown,
    ).data;
    expect(stale.generationStale).toBe(true);
    const blocked = await agent
      .post(`/api/v1/duty-weeks/${draft.id}/publish`)
      .set('Origin', 'http://localhost:5173')
      .send({ expectedVersion: generated.version })
      .expect(409);
    expect(ProblemDetailsSchema.parse(blocked.body as unknown).code).toBe(
      'GENERATION_CONTEXT_STALE',
    );

    const regenerated = await generateWeek(agent, stale);
    await agent
      .post(`/api/v1/duty-weeks/${draft.id}/publish`)
      .set('Origin', 'http://localhost:5173')
      .send({ expectedVersion: regenerated.version })
      .expect(200);
  });

  it('runs the current hard-constraint validator during publish preflight', async () => {
    const agent = await authenticatedAgent();
    const { classroom } = await classroomWithStudents(agent);
    const outsiderResponse = await agent
      .post('/api/v1/students')
      .set('Origin', 'http://localhost:5173')
      .send({
        displayName: 'Ngoài tổ',
        groupId: classroom.groups[1]?.id,
        active: true,
        gender: 'UNSPECIFIED',
        restrictions: [],
      })
      .expect(201);
    const outsider = StudentEnvelopeSchema.parse(outsiderResponse.body as unknown).data;
    const draft = await createWeek(agent, classroom);
    const generated = await generateWeek(agent, draft);
    await DutyWeekModel.updateOne(
      { _id: draft.id },
      {
        $set: {
          'assignments.0.studentId': outsider.id,
          'assignments.0.studentDisplayName': outsider.displayName,
        },
      },
    );
    const blocked = await agent
      .post(`/api/v1/duty-weeks/${draft.id}/publish`)
      .set('Origin', 'http://localhost:5173')
      .send({ expectedVersion: generated.version })
      .expect(409);
    expect(ProblemDetailsSchema.parse(blocked.body as unknown).code).toBe(
      'HARD_CONSTRAINT_VIOLATION',
    );
  });

  it('blocks group changes with locks and otherwise clears every old assignment and absence', async () => {
    const agent = await authenticatedAgent();
    const { classroom, students } = await classroomWithStudents(agent);
    let draft = await createWeek(agent, classroom);
    const absenceResponse = await agent
      .put(`/api/v1/duty-weeks/${draft.id}/absences`)
      .set('Origin', 'http://localhost:5173')
      .send({
        expectedVersion: draft.version,
        absences: [{ studentId: students[0]?.id, date: '2026-08-24' }],
      });
    if (absenceResponse.status !== 200) throw new Error(JSON.stringify(absenceResponse.body));
    draft = WeekEnvelopeSchema.parse(absenceResponse.body as unknown).data;
    const generated = await generateWeek(agent, draft);
    const slotId = generated.assignments[0]?.slotId ?? '';
    const locked = WeekEnvelopeSchema.parse(
      (
        await agent
          .patch(`/api/v1/duty-weeks/${draft.id}/slots/${slotId}/lock`)
          .set('Origin', 'http://localhost:5173')
          .send({ expectedVersion: generated.version, locked: true })
          .expect(200)
      ).body as unknown,
    ).data;
    const blocked = await agent
      .patch(`/api/v1/duty-weeks/${draft.id}`)
      .set('Origin', 'http://localhost:5173')
      .send({ selectedGroupId: classroom.groups[1]?.id, expectedVersion: locked.version })
      .expect(409);
    expect(ProblemDetailsSchema.parse(blocked.body as unknown).code).toBe(
      'LOCKED_ASSIGNMENTS_BLOCK_GROUP_CHANGE',
    );

    const unlocked = WeekEnvelopeSchema.parse(
      (
        await agent
          .patch(`/api/v1/duty-weeks/${draft.id}/slots/${slotId}/lock`)
          .set('Origin', 'http://localhost:5173')
          .send({ expectedVersion: locked.version, locked: false })
          .expect(200)
      ).body as unknown,
    ).data;
    const changed = WeekEnvelopeSchema.parse(
      (
        await agent
          .patch(`/api/v1/duty-weeks/${draft.id}`)
          .set('Origin', 'http://localhost:5173')
          .send({ selectedGroupId: classroom.groups[1]?.id, expectedVersion: unlocked.version })
          .expect(200)
      ).body as unknown,
    ).data;
    expect(changed.selectedGroupId).toBe(classroom.groups[1]?.id);
    expect(changed.assignments).toEqual([]);
    expect(changed.absences).toEqual([]);
    expect(changed.requiresGeneration).toBe(true);
    expect(changed.generationContextHash).toBeNull();
  });

  it('allows an explicit valid correction only after preflight', async () => {
    const agent = await authenticatedAgent();
    const { classroom, students } = await classroomWithStudents(agent);
    const draft = await createWeek(agent, classroom);
    const generated = await generateWeek(agent, draft);
    const target = generated.assignments.find((assignment) => {
      const occurrence = generated.taskOccurrences.find(
        (item) => item.id === assignment.occurrenceId,
      );
      return occurrence?.requiredStudents === 1;
    })!;
    const replacementStudent = students.find((student) => student.id !== target.studentId)!;
    const corrected = WeekEnvelopeSchema.parse(
      (
        await agent
          .put(`/api/v1/duty-weeks/${draft.id}/slots/${target.slotId}/assignment`)
          .set('Origin', 'http://localhost:5173')
          .send({ expectedVersion: generated.version, studentId: replacementStudent.id })
          .expect(200)
      ).body as unknown,
    ).data;
    expect(corrected.requiresGeneration).toBe(true);
    await agent
      .post(`/api/v1/duty-weeks/${draft.id}/publish`)
      .set('Origin', 'http://localhost:5173')
      .send({ expectedVersion: corrected.version })
      .expect(409);
    const preflighted = WeekEnvelopeSchema.parse(
      (
        await agent
          .post(`/api/v1/duty-weeks/${draft.id}/preflight`)
          .set('Origin', 'http://localhost:5173')
          .send({ expectedVersion: corrected.version })
          .expect(200)
      ).body as unknown,
    ).data;
    expect(preflighted.generationValidationSource).toBe('MANUAL_PREFLIGHT');
    await agent
      .post(`/api/v1/duty-weeks/${draft.id}/publish`)
      .set('Origin', 'http://localhost:5173')
      .send({ expectedVersion: preflighted.version })
      .expect(200);
  });

  it('keeps an outside teacher assignment fixed without granting future fairness credit', async () => {
    const agent = await authenticatedAgent();
    const { classroom } = await classroomWithStudents(agent);
    const outsideGroup = classroom.groups[1];
    if (!outsideGroup) throw new Error('Expected a second classroom group.');
    const outsider = StudentEnvelopeSchema.parse(
      (
        await agent
          .post('/api/v1/students')
          .set('Origin', 'http://localhost:5173')
          .send({
            displayName: 'An ngoài tổ',
            groupId: outsideGroup.id,
            active: true,
            gender: 'UNSPECIFIED',
            restrictions: [],
          })
          .expect(201)
      ).body as unknown,
    ).data;
    const draft = await createWeek(agent, classroom);
    const generated = await generateWeek(agent, draft);
    const originalAssignmentCount = generated.assignments.length;
    const target = generated.assignments.find((assignment) => {
      const occurrence = generated.taskOccurrences.find(
        (item) => item.id === assignment.occurrenceId,
      );
      return occurrence?.eligibilityRule === 'ANY';
    });
    if (!target) throw new Error('Expected an unrestricted assignment slot.');

    const designated = WeekEnvelopeSchema.parse(
      (
        await agent
          .put(`/api/v1/duty-weeks/${draft.id}/slots/${target.slotId}/assignment`)
          .set('Origin', 'http://localhost:5173')
          .send({ expectedVersion: generated.version, studentId: outsider.id })
          .expect(200)
      ).body as unknown,
    ).data;
    expect(designated.assignments).toHaveLength(originalAssignmentCount);
    expect(designated.assignments.find((item) => item.slotId === target.slotId)).toMatchObject({
      studentId: outsider.id,
      source: 'TEACHER_ASSIGNED',
    });
    expect(designated.studentSnapshots).toContainEqual(
      expect.objectContaining({
        id: outsider.id,
        groupId: outsideGroup.id,
        groupName: outsideGroup.name,
      }),
    );

    const regenerated = await generateWeek(agent, designated);
    expect(regenerated.assignments).toHaveLength(originalAssignmentCount);
    expect(regenerated.assignments.find((item) => item.slotId === target.slotId)).toMatchObject({
      studentId: outsider.id,
      source: 'TEACHER_ASSIGNED',
    });
    expect(
      regenerated.fairness?.workloadByStudent.some((student) => student.studentId === outsider.id),
    ).toBe(false);

    const published = WeekEnvelopeSchema.parse(
      (
        await agent
          .post(`/api/v1/duty-weeks/${draft.id}/publish`)
          .set('Origin', 'http://localhost:5173')
          .send({ expectedVersion: regenerated.version })
          .expect(200)
      ).body as unknown,
    ).data;
    const completed = WeekEnvelopeSchema.parse(
      (
        await agent
          .post(`/api/v1/duty-weeks/${draft.id}/complete`)
          .set('Origin', 'http://localhost:5173')
          .send({ expectedVersion: published.version, actualPerformers: [] })
          .expect(200)
      ).body as unknown,
    ).data;
    expect(completed.assignments.find((item) => item.slotId === target.slotId)).toMatchObject({
      actualStudentId: outsider.id,
      source: 'TEACHER_ASSIGNED',
    });
    expect(completed.completionLedger.some((entry) => entry.studentId === outsider.id)).toBe(false);
  });

  it('enforces unique weeks and optimistic concurrency for simultaneous edits', async () => {
    const agent = await authenticatedAgent();
    const { classroom } = await classroomWithStudents(agent);
    const draft = await createWeek(agent, classroom);
    const duplicate = await agent
      .post('/api/v1/duty-weeks')
      .set('Origin', 'http://localhost:5173')
      .send({ weekStart: '2026-08-24', selectedGroupId: classroom.groups[0]?.id })
      .expect(409);
    expect(ProblemDetailsSchema.parse(duplicate.body as unknown).code).toBe('WEEK_ALREADY_EXISTS');

    const requests = ['Bản sửa A', 'Bản sửa B'].map((selectionNote) =>
      agent
        .patch(`/api/v1/duty-weeks/${draft.id}`)
        .set('Origin', 'http://localhost:5173')
        .send({ selectionNote, expectedVersion: draft.version }),
    );
    const responses = await Promise.all(requests);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    const conflict = responses.find((response) => response.status === 409);
    expect(ProblemDetailsSchema.parse(conflict?.body as unknown).code).toBe('VERSION_CONFLICT');
  });

  it('supports bounded one-offs, replacement ranking and atomic swaps', async () => {
    const agent = await authenticatedAgent();
    const { classroom } = await classroomWithStudents(agent);
    let draft = await createWeek(agent, classroom);
    const oneOffResponse = await agent
      .post(`/api/v1/duty-weeks/${draft.id}/task-occurrences`)
      .set('Origin', 'http://localhost:5173')
      .send({
        date: '2026-08-25',
        taskName: 'Lau cửa sổ',
        workloadLevel: 2,
        eligibilityRule: 'ANY',
        requiredStudents: 1,
        enabled: true,
        expectedVersion: draft.version,
      })
      .expect(201);
    draft = WeekEnvelopeSchema.parse(oneOffResponse.body as unknown).data;
    const oneOff = draft.taskOccurrences.find((occurrence) => occurrence.source === 'ONE_OFF')!;
    const patchedResponse = await agent
      .patch(`/api/v1/duty-weeks/${draft.id}/task-occurrences/${oneOff.id}`)
      .set('Origin', 'http://localhost:5173')
      .send({ requiredStudents: 2, expectedVersion: draft.version })
      .expect(200);
    draft = WeekEnvelopeSchema.parse(patchedResponse.body as unknown).data;
    expect(
      draft.taskOccurrences.find((occurrence) => occurrence.id === oneOff.id)?.slots,
    ).toHaveLength(2);
    const deletedResponse = await agent
      .delete(`/api/v1/duty-weeks/${draft.id}/task-occurrences/${oneOff.id}`)
      .set('Origin', 'http://localhost:5173')
      .send({ expectedVersion: draft.version })
      .expect(200);
    draft = WeekEnvelopeSchema.parse(deletedResponse.body as unknown).data;
    expect(draft.taskOccurrences.some((occurrence) => occurrence.id === oneOff.id)).toBe(false);

    const generated = await generateWeek(agent, draft);
    const singleSlots = generated.taskOccurrences
      .filter((occurrence) => occurrence.requiredStudents === 1)
      .map((occurrence) => occurrence.slots[0]?.id)
      .filter((slotId): slotId is string => slotId !== undefined);
    const firstSlotId = singleSlots[0]!;
    const secondSlotId = singleSlots[1]!;
    const beforeReplacement = new Map(
      generated.assignments.map((assignment) => [assignment.slotId, assignment.studentId]),
    );
    const suggestionsResponse = await agent
      .get(`/api/v1/duty-weeks/${draft.id}/slots/${firstSlotId}/replacements`)
      .expect(200);
    const suggestions = z
      .strictObject({
        data: z.array(
          z.strictObject({
            studentId: z.string(),
            penalty: z.number(),
            requiredRelaxationLevel: z.number(),
            facts: z.record(z.string(), z.unknown()),
            reasonCodes: z.array(z.string()),
            explanations: z.array(z.string()),
          }),
        ),
      })
      .parse(suggestionsResponse.body as unknown).data;
    const replacement = suggestions[0]!;
    const replacedResponse = await agent
      .post(`/api/v1/duty-weeks/${draft.id}/slots/${firstSlotId}/replace`)
      .set('Origin', 'http://localhost:5173')
      .send({ studentId: replacement.studentId, expectedVersion: generated.version })
      .expect(200);
    const replaced = WeekEnvelopeSchema.parse(replacedResponse.body as unknown).data;
    expect(
      replaced.assignments.find((assignment) => assignment.slotId === firstSlotId)?.source,
    ).toBe('REPLACEMENT');
    for (const assignment of replaced.assignments.filter((item) => item.slotId !== firstSlotId)) {
      expect(assignment.studentId).toBe(beforeReplacement.get(assignment.slotId));
    }

    const beforeSwap = new Map(
      replaced.assignments.map((assignment) => [assignment.slotId, assignment.studentId]),
    );
    const swappedResponse = await agent
      .post(`/api/v1/duty-weeks/${draft.id}/assignments/swap`)
      .set('Origin', 'http://localhost:5173')
      .send({ firstSlotId, secondSlotId, expectedVersion: replaced.version })
      .expect(200);
    const swapped = WeekEnvelopeSchema.parse(swappedResponse.body as unknown).data;
    expect(
      swapped.assignments.find((assignment) => assignment.slotId === firstSlotId)?.studentId,
    ).toBe(beforeSwap.get(secondSlotId));
    expect(
      swapped.assignments.find((assignment) => assignment.slotId === secondSlotId)?.studentId,
    ).toBe(beforeSwap.get(firstSlotId));
  });
});
