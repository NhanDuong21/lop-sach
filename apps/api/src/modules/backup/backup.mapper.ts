import {
  BackupClassroomSchema,
  BackupEnvelopeSchema,
  StudentSchema,
  TaskTemplateSchema,
  type BackupEnvelope,
  type Student,
  type TaskTemplate,
} from '@lop-sach/contracts';
import type { HydratedDocument } from 'mongoose';
import { mapDutyWeek, type DutyWeekHydrated } from '../duty-weeks/duty-week.mapper.js';
import type { ClassroomDocument } from '../classroom/classroom.model.js';
import type { StudentDocument } from '../students/student.model.js';
import type { TaskTemplateDocument } from '../task-templates/task-template.model.js';

type ClassroomHydrated = HydratedDocument<ClassroomDocument> & { readonly version?: number };
type StudentHydrated = HydratedDocument<StudentDocument> & { version: number };
type TaskHydrated = HydratedDocument<TaskTemplateDocument> & { version: number };

function mapClassroom(document: ClassroomHydrated): BackupEnvelope['classroom'] {
  return BackupClassroomSchema.parse({
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
    dataRevision: document.dataRevision,
    version: document.version ?? 0,
  });
}

function mapStudent(document: StudentHydrated): Student {
  return StudentSchema.parse({
    id: String(document._id),
    classroomId: String(document.classroomId),
    displayName: document.displayName,
    groupId: document.groupId,
    active: document.active,
    gender: document.gender,
    participationStart: document.participationStart,
    participationEnd: document.participationEnd,
    restrictions: document.restrictions.map((restriction) => ({
      id: String(restriction.id),
      type: restriction.type,
      ...(restriction.note ? { note: restriction.note } : {}),
      ...(restriction.taskTemplateId ? { taskTemplateId: restriction.taskTemplateId } : {}),
      ...(restriction.startDate ? { startDate: restriction.startDate } : {}),
      ...(restriction.endDate ? { endDate: restriction.endDate } : {}),
    })),
    version: document.version,
  });
}

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

export function mapBackupEnvelope(input: {
  readonly classroom: ClassroomHydrated;
  readonly students: readonly StudentHydrated[];
  readonly taskTemplates: readonly TaskHydrated[];
  readonly dutyWeeks: readonly DutyWeekHydrated[];
  readonly exportedAt: string;
  readonly productVersion: string;
}): BackupEnvelope {
  return BackupEnvelopeSchema.parse({
    schemaVersion: 1,
    product: 'Lớp Sạch',
    productVersion: input.productVersion,
    exportedAt: input.exportedAt,
    classroom: mapClassroom(input.classroom),
    students: input.students.map(mapStudent),
    taskTemplates: input.taskTemplates.map(mapTask),
    dutyWeeks: input.dutyWeeks.map((week) => {
      const mapped = mapDutyWeek(week, false);
      return {
        ...mapped,
        changeLog: mapped.changeLog.map((entry) => ({ ...entry, actorUserId: 'OWNER' })),
      };
    }),
  });
}
