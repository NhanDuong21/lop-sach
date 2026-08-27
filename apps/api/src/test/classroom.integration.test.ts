import './setup.js';
import {
  ClassroomSchema,
  ProblemDetailsSchema,
  StudentSchema,
  TaskTemplateSchema,
  type Classroom,
} from '@lop-sach/contracts';
import request from 'supertest';
import { z } from 'zod';
import { beforeEach, describe, expect, it } from 'vitest';
import { StudentModel } from '../modules/students/student.model.js';
import { createTestOwner, testApp } from './test-app.js';

type TestAgent = ReturnType<typeof request.agent>;
const ClassroomEnvelopeSchema = z.strictObject({ data: ClassroomSchema });
const StudentEnvelopeSchema = z.strictObject({ data: StudentSchema });
const StudentListEnvelopeSchema = z.strictObject({ data: z.array(StudentSchema) });
const TaskEnvelopeSchema = z.strictObject({ data: TaskTemplateSchema });
const TaskListEnvelopeSchema = z.strictObject({ data: z.array(TaskTemplateSchema) });

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

async function createDefaultClassroom(agent: TestAgent): Promise<Classroom> {
  const response = await agent
    .put('/api/v1/classroom')
    .set('Origin', 'http://localhost:5173')
    .send({
      name: '10C8',
      schoolYear: '2026-2027',
      schoolDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
    })
    .expect(201);
  return ClassroomEnvelopeSchema.parse(response.body as unknown).data;
}

describe('classroom master data', () => {
  it('adds a pasted student list atomically with safe defaults', async () => {
    const agent = await authenticatedAgent();
    const classroom = await createDefaultClassroom(agent);
    const groupId = classroom.groups[0]?.id ?? '';
    const response = await agent
      .post('/api/v1/students/bulk')
      .set('Origin', 'http://localhost:5173')
      .send({ groupId, displayNames: ['Nguyễn Văn An', 'Trần Thị Bình', 'Lê Minh Châu'] })
      .expect(201);
    const students = StudentListEnvelopeSchema.parse(response.body as unknown).data;
    expect(students.map((student) => student.displayName)).toEqual([
      'Nguyễn Văn An',
      'Trần Thị Bình',
      'Lê Minh Châu',
    ]);
    expect(students).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          groupId,
          active: true,
          gender: 'UNSPECIFIED',
          restrictions: [],
          participationStart: null,
          participationEnd: null,
        }),
      ]),
    );
    const refreshed = ClassroomEnvelopeSchema.parse(
      (await agent.get('/api/v1/classroom').expect(200)).body as unknown,
    ).data;
    expect(refreshed.revisionCounters.students).toBe(1);

    await agent
      .post('/api/v1/students/bulk')
      .set('Origin', 'http://localhost:5173')
      .send({ groupId, displayNames: ['Tên lặp', 'tên lặp'] })
      .expect(422);
    expect(await StudentModel.countDocuments()).toBe(3);
  });

  it('creates stable default groups/tasks and updates auth status', async () => {
    const agent = await authenticatedAgent();
    const classroom = await createDefaultClassroom(agent);
    expect(classroom.groups.map((group) => group.name)).toEqual(['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4']);
    expect(classroom.revisionCounters).toEqual({ classroom: 1, students: 0, tasks: 1 });

    const tasksResponse = await agent.get('/api/v1/task-templates').expect(200);
    const tasks = TaskListEnvelopeSchema.parse(tasksResponse.body as unknown).data;
    expect(tasks.map((task) => [task.name, task.requiredStudents, task.workloadLevel])).toEqual([
      ['Lau bảng', 1, 1],
      ['Quét lớp', 2, 2],
      ['Đổ rác', 1, 2],
    ]);
    const me = await agent.get('/api/v1/auth/me').expect(200);
    expect(me.body).toMatchObject({ data: { hasClassroom: true, onboardingCompleted: false } });
    expect(classroom.onboarding.currentStep).toBe(2);
  });

  it('keeps group IDs stable and enforces optimistic classroom versions', async () => {
    const agent = await authenticatedAgent();
    const classroom = await createDefaultClassroom(agent);
    const createdResponse = await agent
      .post('/api/v1/classroom/groups')
      .set('Origin', 'http://localhost:5173')
      .send({ name: 'Tổ hỗ trợ', expectedVersion: classroom.version })
      .expect(201);
    const created = ClassroomEnvelopeSchema.parse(createdResponse.body as unknown).data;
    const group = created.groups.find((candidate) => candidate.name === 'Tổ hỗ trợ');
    expect(group).toBeDefined();

    const renamedResponse = await agent
      .patch(`/api/v1/classroom/groups/${group?.id ?? ''}`)
      .set('Origin', 'http://localhost:5173')
      .send({ name: 'Tổ trực bổ sung', order: 0, expectedVersion: created.version })
      .expect(200);
    const renamed = ClassroomEnvelopeSchema.parse(renamedResponse.body as unknown).data;
    expect(renamed.groups.find((candidate) => candidate.id === group?.id)?.name).toBe(
      'Tổ trực bổ sung',
    );
    await agent
      .patch(`/api/v1/classroom/groups/${group?.id ?? ''}`)
      .set('Origin', 'http://localhost:5173')
      .send({ name: 'Tên cũ', expectedVersion: created.version })
      .expect(409);
  });

  it('uses weekly absences as the only specific-date availability source', async () => {
    const agent = await authenticatedAgent();
    const classroom = await createDefaultClassroom(agent);
    const tasks = TaskListEnvelopeSchema.parse(
      (await agent.get('/api/v1/task-templates').expect(200)).body as unknown,
    ).data;
    const groupId = classroom.groups[0]?.id ?? '';
    const taskId = tasks[0]?.id ?? '';
    const studentResponse = await agent
      .post('/api/v1/students')
      .set('Origin', 'http://localhost:5173')
      .send({
        displayName: 'Nguyễn An',
        groupId,
        active: true,
        gender: 'UNSPECIFIED',
        participationStart: null,
        participationEnd: null,
        restrictions: [
          { type: 'NO_HEAVY_TASKS', note: 'Hạn chế sức khỏe' },
          { type: 'TASK_EXCLUSION', taskTemplateId: taskId },
          { type: 'EXEMPT_DATE_RANGE', startDate: '2026-09-01', endDate: '2026-09-10' },
        ],
      })
      .expect(201);
    const student = StudentEnvelopeSchema.parse(studentResponse.body as unknown).data;
    expect(student.restrictions.map((restriction) => restriction.type)).toEqual([
      'NO_HEAVY_TASKS',
      'TASK_EXCLUSION',
      'EXEMPT_DATE_RANGE',
    ]);

    const invalid = await agent
      .post('/api/v1/students')
      .set('Origin', 'http://localhost:5173')
      .send({
        displayName: 'Bình',
        groupId,
        restrictions: [{ type: 'UNAVAILABLE_DATE', date: '2026-09-02' }],
      })
      .expect(422);
    expect(ProblemDetailsSchema.parse(invalid.body as unknown).code).toBe('VALIDATION_FAILED');
    expect(await StudentModel.countDocuments()).toBe(1);

    const refreshed = ClassroomEnvelopeSchema.parse(
      (await agent.get('/api/v1/classroom').expect(200)).body as unknown,
    ).data;
    expect(refreshed.revisionCounters.students).toBe(1);
    const blocked = await agent
      .post(`/api/v1/classroom/groups/${groupId}/deactivate`)
      .set('Origin', 'http://localhost:5173')
      .send({ expectedVersion: refreshed.version })
      .expect(409);
    expect(ProblemDetailsSchema.parse(blocked.body as unknown).code).toBe('GROUP_IN_USE');

    const movedResponse = await agent
      .post(`/api/v1/students/${student.id}/move`)
      .set('Origin', 'http://localhost:5173')
      .send({ groupId: classroom.groups[1]?.id, expectedVersion: student.version })
      .expect(200);
    const moved = StudentEnvelopeSchema.parse(movedResponse.body as unknown).data;
    expect(moved.groupId).toBe(classroom.groups[1]?.id);
    const afterMove = ClassroomEnvelopeSchema.parse(
      (await agent.get('/api/v1/classroom').expect(200)).body as unknown,
    ).data;
    await agent
      .post(`/api/v1/classroom/groups/${groupId}/deactivate`)
      .set('Origin', 'http://localhost:5173')
      .send({ expectedVersion: afterMove.version })
      .expect(200);
    await agent
      .post(`/api/v1/students/${student.id}/deactivate`)
      .set('Origin', 'http://localhost:5173')
      .send({ expectedVersion: moved.version })
      .expect(200);
    expect(await StudentModel.countDocuments({ _id: student.id })).toBe(1);
  });

  it('updates task revisions and reorders the complete task set atomically', async () => {
    const agent = await authenticatedAgent();
    await createDefaultClassroom(agent);
    const initial = TaskListEnvelopeSchema.parse(
      (await agent.get('/api/v1/task-templates').expect(200)).body as unknown,
    ).data;
    const createdResponse = await agent
      .post('/api/v1/task-templates')
      .set('Origin', 'http://localhost:5173')
      .send({
        name: 'Lau cửa sổ',
        schoolDays: ['SATURDAY'],
        requiredStudents: 2,
        workloadLevel: 2,
        eligibilityRule: 'ANY',
      })
      .expect(201);
    const created = TaskEnvelopeSchema.parse(createdResponse.body as unknown).data;
    const classroom = ClassroomEnvelopeSchema.parse(
      (await agent.get('/api/v1/classroom').expect(200)).body as unknown,
    ).data;
    expect(classroom.revisionCounters.tasks).toBe(2);

    const patchedResponse = await agent
      .patch(`/api/v1/task-templates/${created.id}`)
      .set('Origin', 'http://localhost:5173')
      .send({ workloadLevel: 3, expectedVersion: created.version })
      .expect(200);
    const patched = TaskEnvelopeSchema.parse(patchedResponse.body as unknown).data;
    expect(patched.workloadLevel).toBe(3);
    const afterPatch = ClassroomEnvelopeSchema.parse(
      (await agent.get('/api/v1/classroom').expect(200)).body as unknown,
    ).data;

    const ids = [...initial.map((task) => task.id), created.id].reverse();
    const reorderResponse = await agent
      .put('/api/v1/task-templates/order')
      .set('Origin', 'http://localhost:5173')
      .send({ taskIds: ids, expectedTasksRevision: afterPatch.revisionCounters.tasks })
      .expect(200);
    const reordered = TaskListEnvelopeSchema.parse(reorderResponse.body as unknown).data;
    expect(reordered.map((task) => task.id)).toEqual(ids);
    expect((await agent.get('/api/v1/classroom').expect(200)).body).toMatchObject({
      data: { revisionCounters: { tasks: 4 } },
    });
  });
});
