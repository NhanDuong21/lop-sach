import { StudentSchema, type Student, type StudentRestrictionWrite } from '@lop-sach/contracts';
import { Types, type ClientSession, type HydratedDocument } from 'mongoose';
import { withTransaction } from '../../database/transaction.js';
import { createId } from '../../shared/ids.js';
import { HttpProblem } from '../../shared/problem.js';
import { ClassroomModel, type ClassroomDocument } from '../classroom/classroom.model.js';
import { TaskTemplateModel } from '../task-templates/task-template.model.js';
import { StudentModel, type StudentDocument } from './student.model.js';

interface StudentCreateInput {
  readonly displayName: string;
  readonly groupId: string;
  readonly active: boolean;
  readonly gender: 'MALE' | 'FEMALE' | 'UNSPECIFIED';
  readonly participationStart: string | null;
  readonly participationEnd: string | null;
  readonly restrictions: readonly StudentRestrictionWrite[];
}
interface StudentPatchInput {
  readonly displayName?: string | undefined;
  readonly gender?: 'MALE' | 'FEMALE' | 'UNSPECIFIED' | undefined;
  readonly participationStart?: string | null | undefined;
  readonly participationEnd?: string | null | undefined;
  readonly restrictions?: readonly StudentRestrictionWrite[] | undefined;
  readonly expectedVersion: number;
}

type StudentHydrated = HydratedDocument<StudentDocument> & { version: number };
type ClassroomHydrated = HydratedDocument<ClassroomDocument> & { version: number };

function mapStudent(document: StudentHydrated): Student {
  const restrictions = document.restrictions.map((restriction) => {
    const base = { id: String(restriction.id), ...(restriction.note ? { note: restriction.note } : {}) };
    if (restriction.type === 'NO_HEAVY_TASKS') return { ...base, type: restriction.type };
    if (restriction.type === 'TASK_EXCLUSION') return { ...base, type: restriction.type, taskTemplateId: restriction.taskTemplateId };
    return { ...base, type: restriction.type, startDate: restriction.startDate, endDate: restriction.endDate };
  });
  return StudentSchema.parse({
    id: String(document._id),
    classroomId: String(document.classroomId),
    displayName: document.displayName,
    groupId: document.groupId,
    active: document.active,
    gender: document.gender,
    participationStart: document.participationStart,
    participationEnd: document.participationEnd,
    restrictions,
    version: document.version,
  });
}

async function ownerClassroom(ownerId: string, session?: ClientSession): Promise<ClassroomHydrated> {
  const query = ClassroomModel.findOne({ ownerId: new Types.ObjectId(ownerId) });
  if (session) query.session(session);
  const classroom = await query;
  if (!classroom) throw new HttpProblem(404, 'RESOURCE_NOT_FOUND', 'Chưa có lớp học.');
  return classroom as ClassroomHydrated;
}

function activeGroup(classroom: ClassroomHydrated, groupId: string): void {
  if (!classroom.groups.some((group) => group.id === groupId && group.active)) {
    throw new HttpProblem(422, 'VALIDATION_FAILED', 'Tổ không tồn tại hoặc đã ngừng hoạt động.');
  }
}

function studentObjectId(studentId: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(studentId)) throw new HttpProblem(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy học sinh.');
  return new Types.ObjectId(studentId);
}

async function findStudent(classroomId: Types.ObjectId, studentId: string, session?: ClientSession): Promise<StudentHydrated> {
  const query = StudentModel.findOne({ _id: studentObjectId(studentId), classroomId });
  if (session) query.session(session);
  const student = await query;
  if (!student) throw new HttpProblem(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy học sinh.');
  return student as StudentHydrated;
}

async function validateRestrictions(classroomId: Types.ObjectId, restrictions: readonly StudentRestrictionWrite[], session?: ClientSession): Promise<void> {
  const rawIds = restrictions.filter((restriction) => restriction.type === 'TASK_EXCLUSION').map((restriction) => restriction.taskTemplateId);
  if (rawIds.some((id) => !Types.ObjectId.isValid(id))) throw new HttpProblem(422, 'VALIDATION_FAILED', 'Task bị loại trừ không hợp lệ.');
  const uniqueIds = [...new Set(rawIds)];
  if (uniqueIds.length === 0) return;
  const query = TaskTemplateModel.countDocuments({ classroomId, _id: { $in: uniqueIds.map((id) => new Types.ObjectId(id)) } });
  if (session) query.session(session);
  if (await query !== uniqueIds.length) throw new HttpProblem(422, 'VALIDATION_FAILED', 'Task bị loại trừ không thuộc lớp hiện tại.');
}

function persistedRestrictions(restrictions: readonly StudentRestrictionWrite[]): readonly Record<string, unknown>[] {
  return restrictions.map((restriction) => ({ id: createId(), ...restriction }));
}

async function bumpStudentRevision(classroomId: Types.ObjectId, session: ClientSession): Promise<void> {
  await ClassroomModel.updateOne({ _id: classroomId }, {
    $inc: { 'revisionCounters.students': 1, dataRevision: 1, version: 1 },
  }, { session });
}

function assertStudentVersion(student: StudentHydrated, expectedVersion: number): void {
  if (student.version !== expectedVersion) throw new HttpProblem(409, 'VERSION_CONFLICT', 'Học sinh đã được thay đổi. Hãy tải lại.');
}

export async function listStudents(ownerId: string, filters: { readonly groupId?: string | undefined; readonly active?: boolean | undefined }): Promise<readonly Student[]> {
  const classroom = await ownerClassroom(ownerId);
  const query: Record<string, unknown> = { classroomId: classroom._id };
  if (filters.groupId !== undefined) query.groupId = filters.groupId;
  if (filters.active !== undefined) query.active = filters.active;
  const students = await StudentModel.find(query).sort({ displayName: 1, _id: 1 });
  return students.map((student) => mapStudent(student as StudentHydrated));
}

export async function createStudent(ownerId: string, input: StudentCreateInput): Promise<Student> {
  return withTransaction(async (session) => {
    const classroom = await ownerClassroom(ownerId, session);
    activeGroup(classroom, input.groupId);
    await validateRestrictions(classroom._id, input.restrictions, session);
    const [student] = await StudentModel.create([{
      classroomId: classroom._id,
      groupId: input.groupId,
      displayName: input.displayName,
      active: input.active,
      gender: input.gender,
      participationStart: input.participationStart,
      participationEnd: input.participationEnd,
      restrictions: persistedRestrictions(input.restrictions),
    }], { session, ordered: true });
    if (!student) throw new Error('Không tạo được học sinh.');
    await bumpStudentRevision(classroom._id, session);
    return mapStudent(student as StudentHydrated);
  });
}

export async function patchStudent(ownerId: string, studentId: string, input: StudentPatchInput): Promise<Student> {
  return withTransaction(async (session) => {
    const classroom = await ownerClassroom(ownerId, session);
    const student = await findStudent(classroom._id, studentId, session);
    assertStudentVersion(student, input.expectedVersion);
    const start = input.participationStart !== undefined ? input.participationStart : student.participationStart;
    const end = input.participationEnd !== undefined ? input.participationEnd : student.participationEnd;
    if (start !== null && end !== null && end < start) throw new HttpProblem(422, 'VALIDATION_FAILED', 'Khoảng tham gia không hợp lệ.');
    if (input.displayName !== undefined) student.displayName = input.displayName;
    if (input.gender !== undefined) student.gender = input.gender;
    if (input.participationStart !== undefined) student.set('participationStart', input.participationStart);
    if (input.participationEnd !== undefined) student.set('participationEnd', input.participationEnd);
    if (input.restrictions !== undefined) {
      await validateRestrictions(classroom._id, input.restrictions, session);
      student.set('restrictions', persistedRestrictions(input.restrictions));
    }
    await student.save({ session });
    await bumpStudentRevision(classroom._id, session);
    return mapStudent(student);
  });
}

export async function moveStudent(ownerId: string, studentId: string, groupId: string, expectedVersion: number): Promise<Student> {
  return withTransaction(async (session) => {
    const classroom = await ownerClassroom(ownerId, session);
    activeGroup(classroom, groupId);
    const student = await findStudent(classroom._id, studentId, session);
    assertStudentVersion(student, expectedVersion);
    student.groupId = groupId;
    await student.save({ session });
    await bumpStudentRevision(classroom._id, session);
    return mapStudent(student);
  });
}

export async function setStudentActive(ownerId: string, studentId: string, active: boolean, expectedVersion: number): Promise<Student> {
  return withTransaction(async (session) => {
    const classroom = await ownerClassroom(ownerId, session);
    const student = await findStudent(classroom._id, studentId, session);
    assertStudentVersion(student, expectedVersion);
    if (active) activeGroup(classroom, student.groupId);
    student.active = active;
    await student.save({ session });
    await bumpStudentRevision(classroom._id, session);
    return mapStudent(student);
  });
}
