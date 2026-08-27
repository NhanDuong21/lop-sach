import {
  BACKUP_PRODUCT_VERSION,
  BackupEnvelopeSchema,
  BackupValidationResultSchema,
  type BackupEnvelope,
  type BackupValidationResult,
} from '@lop-sach/contracts';
import { canonicalJson, sha256Hex } from '@lop-sach/scheduler';
import mongoose, { type HydratedDocument } from 'mongoose';
import { withTransaction } from '../../database/transaction.js';
import { HttpProblem } from '../../shared/problem.js';
import { ClassroomModel } from '../classroom/classroom.model.js';
import { DutyWeekModel } from '../duty-weeks/duty-week.model.js';
import type { DutyWeekHydrated } from '../duty-weeks/duty-week.mapper.js';
import { StudentModel, type StudentDocument } from '../students/student.model.js';
import {
  TaskTemplateModel,
  type TaskTemplateDocument,
} from '../task-templates/task-template.model.js';
import { mapBackupEnvelope } from './backup.mapper.js';

const { Types } = mongoose;
type StudentHydrated = HydratedDocument<StudentDocument> & { version: number };
type TaskHydrated = HydratedDocument<TaskTemplateDocument> & { version: number };

function objectId(value: string, field: string): mongoose.Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw new HttpProblem(422, 'VALIDATION_FAILED', `${field} không phải ObjectId hợp lệ.`);
  }
  return new Types.ObjectId(value);
}

function assertUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new HttpProblem(422, 'VALIDATION_FAILED', `${label} có ID trùng lặp.`);
  }
}

function assertBackupIntegrity(backup: BackupEnvelope): void {
  if (backup.productVersion !== BACKUP_PRODUCT_VERSION) {
    throw new HttpProblem(
      422,
      'VALIDATION_FAILED',
      `Backup phiên bản ${backup.productVersion} không tương thích với ${BACKUP_PRODUCT_VERSION}.`,
    );
  }
  objectId(backup.classroom.id, 'classroom.id');
  assertUnique(
    backup.students.map((item) => item.id),
    'Danh sách học sinh',
  );
  assertUnique(
    backup.taskTemplates.map((item) => item.id),
    'Danh sách công việc',
  );
  assertUnique(
    backup.dutyWeeks.map((item) => item.id),
    'Danh sách tuần',
  );
  assertUnique(
    backup.dutyWeeks.map((item) => item.weekStart),
    'Danh sách ngày đầu tuần',
  );

  const classroomId = backup.classroom.id;
  const groupIds = new Set(backup.classroom.groups.map((group) => group.id));
  const taskIds = new Set(backup.taskTemplates.map((task) => task.id));
  for (const student of backup.students) {
    objectId(student.id, 'student.id');
    if (student.classroomId !== classroomId || !groupIds.has(student.groupId))
      throw new HttpProblem(
        422,
        'VALIDATION_FAILED',
        'Học sinh tham chiếu lớp hoặc tổ không hợp lệ.',
      );
    for (const restriction of student.restrictions) {
      if (restriction.type === 'TASK_EXCLUSION' && !taskIds.has(restriction.taskTemplateId))
        throw new HttpProblem(
          422,
          'VALIDATION_FAILED',
          'Hạn chế học sinh tham chiếu công việc không tồn tại.',
        );
    }
  }
  for (const task of backup.taskTemplates) {
    objectId(task.id, 'taskTemplate.id');
    if (task.classroomId !== classroomId)
      throw new HttpProblem(422, 'VALIDATION_FAILED', 'Công việc tham chiếu sai lớp.');
  }
  for (const week of backup.dutyWeeks) {
    objectId(week.id, 'dutyWeek.id');
    if (week.classroomId !== classroomId || !groupIds.has(week.selectedGroupId))
      throw new HttpProblem(422, 'VALIDATION_FAILED', 'Tuần trực tham chiếu sai lớp hoặc tổ.');
  }
}

export function backupDigest(backup: BackupEnvelope): string {
  return sha256Hex(canonicalJson(backup));
}

export function validateBackup(unknownBackup: unknown): BackupValidationResult {
  const backup = BackupEnvelopeSchema.parse(unknownBackup);
  assertBackupIntegrity(backup);
  return BackupValidationResultSchema.parse({
    digest: backupDigest(backup),
    schemaVersion: backup.schemaVersion,
    productVersion: backup.productVersion,
    exportedAt: backup.exportedAt,
    classroomName: backup.classroom.name,
    studentCount: backup.students.length,
    taskTemplateCount: backup.taskTemplates.length,
    dutyWeekCount: backup.dutyWeeks.length,
  });
}

export async function exportBackup(ownerId: string): Promise<BackupEnvelope> {
  const ownerObjectId = objectId(ownerId, 'ownerId');
  const classroom = await ClassroomModel.findOne({
    ownerId: ownerObjectId,
  });
  if (!classroom) throw new HttpProblem(404, 'RESOURCE_NOT_FOUND', 'Chưa có lớp học để sao lưu.');
  const [students, taskTemplates, dutyWeeks] = await Promise.all([
    StudentModel.find({ classroomId: classroom._id }).sort({ _id: 1 }),
    TaskTemplateModel.find({ classroomId: classroom._id }).sort({ order: 1, _id: 1 }),
    DutyWeekModel.find({ classroomId: classroom._id }).sort({ weekStart: 1, _id: 1 }),
  ]);
  return mapBackupEnvelope({
    classroom,
    students: students as StudentHydrated[],
    taskTemplates: taskTemplates as TaskHydrated[],
    dutyWeeks: dutyWeeks as DutyWeekHydrated[],
    exportedAt: new Date().toISOString(),
    productVersion: BACKUP_PRODUCT_VERSION,
  });
}

export async function restoreBackup(
  ownerId: string,
  unknownBackup: unknown,
  confirmedDigest: string,
): Promise<BackupValidationResult> {
  const backup = BackupEnvelopeSchema.parse(unknownBackup);
  const validation = validateBackup(backup);
  if (validation.digest !== confirmedDigest) {
    throw new HttpProblem(409, 'BACKUP_INCOMPATIBLE', 'Backup đã thay đổi sau bước kiểm tra.');
  }
  const ownerObjectId = objectId(ownerId, 'ownerId');
  const restoredClassroomId = objectId(backup.classroom.id, 'classroom.id');
  await withTransaction(async (session) => {
    const existingClassrooms = await ClassroomModel.find({ ownerId: ownerObjectId }, { _id: 1 })
      .session(session)
      .lean();
    const existingClassroomIds = existingClassrooms.map((item) => item._id);
    if (existingClassroomIds.length > 0) {
      await Promise.all([
        DutyWeekModel.deleteMany({ classroomId: { $in: existingClassroomIds } }).session(session),
        StudentModel.deleteMany({ classroomId: { $in: existingClassroomIds } }).session(session),
        TaskTemplateModel.deleteMany({ classroomId: { $in: existingClassroomIds } }).session(
          session,
        ),
      ]);
    }
    await ClassroomModel.deleteMany({ ownerId: ownerObjectId }).session(session);
    await ClassroomModel.create(
      [
        {
          _id: restoredClassroomId,
          ownerId: ownerObjectId,
          name: backup.classroom.name,
          schoolYear: backup.classroom.schoolYear,
          timezone: backup.classroom.timezone,
          schoolDays: backup.classroom.schoolDays,
          groups: backup.classroom.groups,
          onboarding: {
            currentStep: backup.classroom.onboarding.currentStep,
            completedAt: backup.classroom.onboarding.completedAt
              ? new Date(backup.classroom.onboarding.completedAt)
              : null,
          },
          revisionCounters: backup.classroom.revisionCounters,
          dataRevision: backup.classroom.dataRevision,
          version: backup.classroom.version,
        },
      ],
      { session },
    );
    if (backup.students.length > 0)
      await StudentModel.insertMany(
        backup.students.map(({ id, ...student }) => ({
          ...student,
          _id: objectId(id, 'student.id'),
          classroomId: restoredClassroomId,
        })),
        { session },
      );
    if (backup.taskTemplates.length > 0)
      await TaskTemplateModel.insertMany(
        backup.taskTemplates.map(({ id, ...task }) => ({
          ...task,
          _id: objectId(id, 'taskTemplate.id'),
          classroomId: restoredClassroomId,
        })),
        { session },
      );
    if (backup.dutyWeeks.length > 0)
      await DutyWeekModel.insertMany(
        backup.dutyWeeks.map(({ id, ...week }) => ({
          ...week,
          changeLog: week.changeLog.map((entry) => ({ ...entry, actorUserId: ownerId })),
          _id: objectId(id, 'dutyWeek.id'),
          ownerId: ownerObjectId,
          classroomId: restoredClassroomId,
        })),
        { session },
      );
  });
  return validation;
}
