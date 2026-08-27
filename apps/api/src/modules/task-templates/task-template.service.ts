import {
  TaskTemplateSchema,
  type TaskTemplate,
  type TaskEligibilityRule,
  type WorkloadLevel,
} from '@lop-sach/contracts';
import mongoose, { type ClientSession, type HydratedDocument } from 'mongoose';
import { withTransaction } from '../../database/transaction.js';
import { HttpProblem } from '../../shared/problem.js';
import { ClassroomModel, type ClassroomDocument } from '../classroom/classroom.model.js';
import { TaskTemplateModel, type TaskTemplateDocument } from './task-template.model.js';

const { Types } = mongoose;

interface TaskCreateInput {
  readonly name: string;
  readonly active: boolean;
  readonly schoolDays: readonly string[];
  readonly requiredStudents: number;
  readonly workloadLevel: WorkloadLevel;
  readonly eligibilityRule: TaskEligibilityRule;
}
interface TaskPatchInput {
  readonly name?: string | undefined;
  readonly schoolDays?: readonly string[] | undefined;
  readonly requiredStudents?: number | undefined;
  readonly workloadLevel?: WorkloadLevel | undefined;
  readonly eligibilityRule?: TaskEligibilityRule | undefined;
  readonly expectedVersion: number;
}

type TaskHydrated = HydratedDocument<TaskTemplateDocument> & { version: number };
type ClassroomHydrated = HydratedDocument<ClassroomDocument> & { version: number };

function mapTask(document: TaskHydrated): TaskTemplate {
  return TaskTemplateSchema.parse({
    id: String(document._id),
    classroomId: String(document.classroomId),
    name: document.name,
    active: document.active,
    order: document.order,
    schoolDays: [...document.schoolDays],
    requiredStudents: document.requiredStudents,
    workloadLevel: document.workloadLevel,
    eligibilityRule: document.eligibilityRule,
    version: document.version,
  });
}

async function ownerClassroom(
  ownerId: string,
  session?: ClientSession,
): Promise<ClassroomHydrated> {
  const query = ClassroomModel.findOne({ ownerId: new Types.ObjectId(ownerId) });
  if (session) query.session(session);
  const classroom = await query;
  if (!classroom) throw new HttpProblem(404, 'RESOURCE_NOT_FOUND', 'Chưa có lớp học.');
  return classroom as ClassroomHydrated;
}

function taskObjectId(taskId: string): mongoose.Types.ObjectId {
  if (!Types.ObjectId.isValid(taskId))
    throw new HttpProblem(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy task.');
  return new Types.ObjectId(taskId);
}

async function findTask(
  classroomId: mongoose.Types.ObjectId,
  taskId: string,
  session?: ClientSession,
): Promise<TaskHydrated> {
  const query = TaskTemplateModel.findOne({ _id: taskObjectId(taskId), classroomId });
  if (session) query.session(session);
  const task = await query;
  if (!task) throw new HttpProblem(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy task.');
  return task as TaskHydrated;
}

async function bumpTaskRevision(
  classroomId: mongoose.Types.ObjectId,
  session: ClientSession,
): Promise<void> {
  await ClassroomModel.updateOne(
    { _id: classroomId },
    {
      $inc: { 'revisionCounters.tasks': 1, dataRevision: 1, version: 1 },
    },
    { session },
  );
}

function assertTaskVersion(task: TaskHydrated, expectedVersion: number): void {
  if (task.version !== expectedVersion)
    throw new HttpProblem(409, 'VERSION_CONFLICT', 'Task đã được thay đổi. Hãy tải lại.');
}

export async function listTaskTemplates(ownerId: string): Promise<readonly TaskTemplate[]> {
  const classroom = await ownerClassroom(ownerId);
  const tasks = await TaskTemplateModel.find({ classroomId: classroom._id }).sort({
    order: 1,
    _id: 1,
  });
  return tasks.map((task) => mapTask(task as TaskHydrated));
}

export async function createTaskTemplate(
  ownerId: string,
  input: TaskCreateInput,
): Promise<TaskTemplate> {
  return withTransaction(async (session) => {
    const classroom = await ownerClassroom(ownerId, session);
    const latest = await TaskTemplateModel.findOne({ classroomId: classroom._id })
      .sort({ order: -1 })
      .session(session);
    const [task] = await TaskTemplateModel.create(
      [
        {
          classroomId: classroom._id,
          ...input,
          schoolDays: [...input.schoolDays],
          order: (latest?.order ?? -1) + 1,
        },
      ],
      { session, ordered: true },
    );
    if (!task) throw new Error('Không tạo được task.');
    await bumpTaskRevision(classroom._id, session);
    return mapTask(task as TaskHydrated);
  });
}

export async function patchTaskTemplate(
  ownerId: string,
  taskId: string,
  input: TaskPatchInput,
): Promise<TaskTemplate> {
  return withTransaction(async (session) => {
    const classroom = await ownerClassroom(ownerId, session);
    const task = await findTask(classroom._id, taskId, session);
    assertTaskVersion(task, input.expectedVersion);
    if (input.name !== undefined) task.name = input.name;
    if (input.schoolDays !== undefined) task.schoolDays = [...input.schoolDays];
    if (input.requiredStudents !== undefined) task.requiredStudents = input.requiredStudents;
    if (input.workloadLevel !== undefined) task.workloadLevel = input.workloadLevel;
    if (input.eligibilityRule !== undefined) task.eligibilityRule = input.eligibilityRule;
    await task.save({ session });
    await bumpTaskRevision(classroom._id, session);
    return mapTask(task);
  });
}

export async function setTaskTemplateActive(
  ownerId: string,
  taskId: string,
  active: boolean,
  expectedVersion: number,
): Promise<TaskTemplate> {
  return withTransaction(async (session) => {
    const classroom = await ownerClassroom(ownerId, session);
    const task = await findTask(classroom._id, taskId, session);
    assertTaskVersion(task, expectedVersion);
    task.active = active;
    await task.save({ session });
    await bumpTaskRevision(classroom._id, session);
    return mapTask(task);
  });
}

export async function reorderTaskTemplates(
  ownerId: string,
  taskIds: readonly string[],
  expectedTasksRevision: number,
): Promise<readonly TaskTemplate[]> {
  return withTransaction(async (session) => {
    const classroom = await ownerClassroom(ownerId, session);
    if (classroom.revisionCounters.tasks !== expectedTasksRevision) {
      throw new HttpProblem(409, 'VERSION_CONFLICT', 'Danh sách task đã thay đổi. Hãy tải lại.');
    }
    if (taskIds.some((taskId) => !Types.ObjectId.isValid(taskId)))
      throw new HttpProblem(422, 'VALIDATION_FAILED', 'Danh sách task không hợp lệ.');
    const tasks = await TaskTemplateModel.find({ classroomId: classroom._id }).session(session);
    const existingIds = new Set(tasks.map((task) => String(task._id)));
    if (existingIds.size !== taskIds.length || taskIds.some((taskId) => !existingIds.has(taskId))) {
      throw new HttpProblem(
        422,
        'VALIDATION_FAILED',
        'Danh sách reorder phải chứa đúng toàn bộ task của lớp.',
      );
    }
    await TaskTemplateModel.bulkWrite(
      taskIds.map((taskId, order) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(taskId), classroomId: classroom._id },
          update: { $set: { order }, $inc: { version: 1 } },
        },
      })),
      { session },
    );
    await bumpTaskRevision(classroom._id, session);
    const reordered = await TaskTemplateModel.find({ classroomId: classroom._id })
      .sort({ order: 1, _id: 1 })
      .session(session);
    return reordered.map((task) => mapTask(task as TaskHydrated));
  });
}
