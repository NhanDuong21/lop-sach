import { ClassroomSchema, type Classroom } from '@lop-sach/contracts';
import mongoose, { type ClientSession, type HydratedDocument } from 'mongoose';
import { withTransaction } from '../../database/transaction.js';
import { createId } from '../../shared/ids.js';
import { HttpProblem } from '../../shared/problem.js';
import { StudentModel } from '../students/student.model.js';
import { TaskTemplateModel } from '../task-templates/task-template.model.js';
import { ClassroomModel, type ClassroomDocument } from './classroom.model.js';

const { Types } = mongoose;

interface ClassroomCreateInput {
  readonly name: string;
  readonly schoolYear: string;
  readonly schoolDays: readonly string[];
}
interface ClassroomPatchInput {
  readonly name?: string | undefined;
  readonly schoolYear?: string | undefined;
  readonly schoolDays?: readonly string[] | undefined;
  readonly onboardingStep?: number | undefined;
  readonly completeOnboarding?: boolean | undefined;
  readonly expectedVersion: number;
}

type ClassroomHydrated = HydratedDocument<ClassroomDocument> & { version: number };

function mapClassroom(document: ClassroomHydrated): Classroom {
  return ClassroomSchema.parse({
    id: String(document._id),
    name: document.name,
    schoolYear: document.schoolYear,
    timezone: document.timezone,
    schoolDays: [...document.schoolDays],
    groups: [...document.groups]
      .sort(
        (left, right) =>
          left.order - right.order || String(left.id).localeCompare(String(right.id)),
      )
      .map((group) => ({
        id: String(group.id),
        name: group.name,
        order: group.order,
        active: group.active,
      })),
    onboarding: {
      currentStep: document.onboarding.currentStep,
      completedAt: document.onboarding.completedAt?.toISOString() ?? null,
    },
    revisionCounters: {
      classroom: document.revisionCounters.classroom,
      students: document.revisionCounters.students,
      tasks: document.revisionCounters.tasks,
    },
    version: document.version,
  });
}

function ownerObjectId(ownerId: string): mongoose.Types.ObjectId {
  return new Types.ObjectId(ownerId);
}

async function findOwnerClassroom(
  ownerId: string,
  session?: ClientSession,
): Promise<ClassroomHydrated> {
  const query = ClassroomModel.findOne({ ownerId: ownerObjectId(ownerId) });
  if (session) query.session(session);
  const classroom = await query;
  if (!classroom) throw new HttpProblem(404, 'RESOURCE_NOT_FOUND', 'Chưa có lớp học.');
  return classroom as ClassroomHydrated;
}

function assertVersion(classroom: ClassroomHydrated, expectedVersion: number): void {
  if (classroom.version !== expectedVersion)
    throw new HttpProblem(409, 'VERSION_CONFLICT', 'Dữ liệu lớp đã thay đổi. Hãy tải lại.');
}

function assertUniqueGroupName(
  classroom: ClassroomHydrated,
  name: string,
  ignoredGroupId?: string,
): void {
  const normalized = name.normalize('NFKC').toLocaleLowerCase('vi');
  if (
    classroom.groups.some(
      (group) =>
        group.id !== ignoredGroupId &&
        group.name.normalize('NFKC').toLocaleLowerCase('vi') === normalized,
    )
  ) {
    throw new HttpProblem(409, 'VALIDATION_FAILED', 'Tên tổ đã tồn tại.');
  }
}

async function saveClassroomMutation(
  classroom: ClassroomHydrated,
  session?: ClientSession,
): Promise<Classroom> {
  classroom.revisionCounters.classroom += 1;
  classroom.dataRevision += 1;
  await classroom.save({ ...(session ? { session } : {}) });
  return mapClassroom(classroom);
}

export async function getClassroom(ownerId: string): Promise<Classroom> {
  return mapClassroom(await findOwnerClassroom(ownerId));
}

export async function createClassroom(
  ownerId: string,
  input: ClassroomCreateInput,
): Promise<Classroom> {
  return withTransaction(async (session) => {
    if (await ClassroomModel.exists({ ownerId: ownerObjectId(ownerId) }).session(session)) {
      throw new HttpProblem(409, 'VERSION_CONFLICT', 'Tài khoản đã có lớp học.');
    }
    const groups = ['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'].map((name, order) => ({
      id: createId(),
      name,
      order,
      active: true,
    }));
    const [classroom] = await ClassroomModel.create(
      [
        {
          ownerId: ownerObjectId(ownerId),
          name: input.name,
          schoolYear: input.schoolYear,
          timezone: 'Asia/Ho_Chi_Minh',
          schoolDays: [...input.schoolDays],
          groups,
          onboarding: { currentStep: 2, completedAt: null },
          revisionCounters: { classroom: 1, students: 0, tasks: 1 },
          dataRevision: 1,
        },
      ],
      { session, ordered: true },
    );
    if (!classroom) throw new Error('Không tạo được lớp học.');
    await TaskTemplateModel.create(
      [
        {
          classroomId: classroom._id,
          name: 'Lau bảng',
          active: true,
          order: 0,
          schoolDays: input.schoolDays,
          requiredStudents: 1,
          workloadLevel: 1,
          eligibilityRule: 'ANY',
        },
        {
          classroomId: classroom._id,
          name: 'Quét lớp',
          active: true,
          order: 1,
          schoolDays: input.schoolDays,
          requiredStudents: 2,
          workloadLevel: 2,
          eligibilityRule: 'ANY',
        },
        {
          classroomId: classroom._id,
          name: 'Đổ rác',
          active: true,
          order: 2,
          schoolDays: input.schoolDays,
          requiredStudents: 1,
          workloadLevel: 2,
          eligibilityRule: 'ANY',
        },
      ],
      { session, ordered: true },
    );
    return mapClassroom(classroom as ClassroomHydrated);
  });
}

export async function patchClassroom(
  ownerId: string,
  input: ClassroomPatchInput,
): Promise<Classroom> {
  const classroom = await findOwnerClassroom(ownerId);
  assertVersion(classroom, input.expectedVersion);
  if (input.name !== undefined) classroom.name = input.name;
  if (input.schoolYear !== undefined) classroom.schoolYear = input.schoolYear;
  if (input.schoolDays !== undefined) classroom.schoolDays = [...input.schoolDays];
  if (input.onboardingStep !== undefined) classroom.onboarding.currentStep = input.onboardingStep;
  if (input.completeOnboarding !== undefined)
    classroom.set('onboarding.completedAt', input.completeOnboarding ? new Date() : null);
  return saveClassroomMutation(classroom);
}

export async function createGroup(
  ownerId: string,
  name: string,
  expectedVersion: number,
): Promise<Classroom> {
  const classroom = await findOwnerClassroom(ownerId);
  assertVersion(classroom, expectedVersion);
  assertUniqueGroupName(classroom, name);
  classroom.groups.push({ id: createId(), name, order: classroom.groups.length, active: true });
  return saveClassroomMutation(classroom);
}

export async function patchGroup(
  ownerId: string,
  groupId: string,
  input: {
    readonly name?: string | undefined;
    readonly order?: number | undefined;
    readonly expectedVersion: number;
  },
): Promise<Classroom> {
  const classroom = await findOwnerClassroom(ownerId);
  assertVersion(classroom, input.expectedVersion);
  const group = classroom.groups.find((candidate) => candidate.id === groupId);
  if (!group) throw new HttpProblem(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy tổ.');
  if (input.name !== undefined) {
    assertUniqueGroupName(classroom, input.name, groupId);
    group.name = input.name;
  }
  if (input.order !== undefined) {
    const ordered = [...classroom.groups].sort(
      (left, right) => left.order - right.order || String(left.id).localeCompare(String(right.id)),
    );
    const currentIndex = ordered.findIndex((candidate) => candidate.id === groupId);
    const [moving] = ordered.splice(currentIndex, 1);
    if (moving) ordered.splice(Math.min(input.order, ordered.length), 0, moving);
    ordered.forEach((candidate, order) => {
      candidate.order = order;
    });
  }
  return saveClassroomMutation(classroom);
}

export async function setGroupActive(
  ownerId: string,
  groupId: string,
  active: boolean,
  expectedVersion: number,
): Promise<Classroom> {
  return withTransaction(async (session) => {
    const classroom = await findOwnerClassroom(ownerId, session);
    assertVersion(classroom, expectedVersion);
    const group = classroom.groups.find((candidate) => candidate.id === groupId);
    if (!group) throw new HttpProblem(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy tổ.');
    if (!active) {
      if (classroom.groups.filter((candidate) => candidate.active).length <= 1) {
        throw new HttpProblem(409, 'GROUP_IN_USE', 'Lớp phải còn ít nhất một tổ hoạt động.');
      }
      if (
        await StudentModel.exists({ classroomId: classroom._id, groupId, active: true }).session(
          session,
        )
      ) {
        throw new HttpProblem(409, 'GROUP_IN_USE', 'Không thể tắt tổ còn học sinh hoạt động.');
      }
    }
    group.active = active;
    return saveClassroomMutation(classroom, session);
  });
}
