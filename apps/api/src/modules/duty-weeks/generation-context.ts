import {
  DateOnlySchema,
  TaskOccurrenceSchema,
  type GenerationRevisionVectorSchema,
  type StudentFairnessBaseline,
} from '@lop-sach/contracts';
import {
  SCHEDULER_ENGINE_VERSION,
  normalizeSchedulerContext,
  schedulerInputHash,
  type SchedulerContext,
} from '@lop-sach/scheduler';
import type { ClientSession, HydratedDocument } from 'mongoose';
import type { z } from 'zod';
import { HttpProblem } from '../../shared/problem.js';
import { ClassroomModel } from '../classroom/classroom.model.js';
import { StudentModel, type StudentDocument } from '../students/student.model.js';
import { mapStudentRestrictions } from '../students/student-restrictions.js';
import {
  TaskTemplateModel,
  type TaskTemplateDocument,
} from '../task-templates/task-template.model.js';
import type { DutyWeekHydrated } from './duty-week.mapper.js';
import { buildFairnessBaseline } from './fairness-baseline.js';

type RevisionVector = z.infer<typeof GenerationRevisionVectorSchema>;
type StudentHydrated = HydratedDocument<StudentDocument> & { version: number };
type TaskHydrated = HydratedDocument<TaskTemplateDocument> & { version: number };

export interface BuiltGenerationContext {
  readonly context: SchedulerContext;
  readonly inputHash: string;
  readonly dataRevisions: RevisionVector;
  readonly fairnessBaseline: readonly StudentFairnessBaseline[];
}

export async function buildGenerationContext(
  week: DutyWeekHydrated,
  generationRevision: number,
  session?: ClientSession,
): Promise<BuiltGenerationContext> {
  const classroomQuery = ClassroomModel.findById(week.classroomId);
  const studentsQuery = StudentModel.find({
    classroomId: week.classroomId,
    groupId: week.selectedGroupId,
  }).sort({ _id: 1 });
  const relevantTaskIds = [
    ...new Set(
      week.taskOccurrences.flatMap((occurrence) =>
        occurrence.taskTemplateId === null ? [] : [occurrence.taskTemplateId],
      ),
    ),
  ];
  const tasksQuery = TaskTemplateModel.find({
    classroomId: week.classroomId,
    _id: { $in: relevantTaskIds },
  }).sort({ _id: 1 });
  if (session) {
    classroomQuery.session(session);
    studentsQuery.session(session);
    tasksQuery.session(session);
  }
  const [classroom, students, tasks] = await Promise.all([
    classroomQuery,
    studentsQuery,
    tasksQuery,
  ]);
  if (!classroom) throw new HttpProblem(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy lớp học.');
  const group = classroom.groups.find(
    (candidate) => candidate.id === week.selectedGroupId && candidate.active,
  );
  if (!group) throw new HttpProblem(409, 'GENERATION_CONTEXT_STALE', 'Tổ trực không còn tồn tại.');
  const studentIds = students.map((student) => String(student._id));
  const fairnessBaseline = await buildFairnessBaseline(
    week.classroomId,
    week.weekStart,
    studentIds,
    session,
  );
  const hydratedStudents = students as StudentHydrated[];
  const hydratedTasks = tasks as TaskHydrated[];
  const studentRevisions = Object.fromEntries(
    hydratedStudents.map((student) => [String(student._id), student.version] as const),
  );
  const taskRevisions = Object.fromEntries(
    hydratedTasks.map((task) => [String(task._id), task.version] as const),
  );
  const dataRevisions: RevisionVector = {
    classroomRevision: classroom.revisionCounters.classroom,
    studentRevisions,
    taskRevisions,
    weekConfigurationRevision: week.configurationRevision,
  };
  const context = normalizeSchedulerContext({
    schedulerEngineVersion: SCHEDULER_ENGINE_VERSION,
    generationRevision,
    dataRevisions,
    input: {
      weekStart: DateOnlySchema.parse(week.weekStart),
      selectedGroupId: week.selectedGroupId,
      students: hydratedStudents.map((student) => ({
        id: String(student._id),
        groupId: student.groupId,
        active: student.active,
        gender: student.gender,
        participationStart: DateOnlySchema.nullable().parse(student.participationStart),
        participationEnd: DateOnlySchema.nullable().parse(student.participationEnd),
        restrictions: mapStudentRestrictions(student.restrictions),
      })),
      occurrences: week.taskOccurrences.map((rawOccurrence) => {
        const occurrence = TaskOccurrenceSchema.parse(rawOccurrence);
        return {
          id: occurrence.id,
          date: occurrence.date,
          taskTemplateId: occurrence.taskTemplateId,
          taskFingerprint: occurrence.taskFingerprint,
          taskName: occurrence.taskName,
          workloadLevel: occurrence.workloadLevel,
          eligibilityRule: occurrence.eligibilityRule,
          requiredStudents: occurrence.requiredStudents,
          enabled: occurrence.enabled,
          order: occurrence.order,
          slots: occurrence.slots,
        };
      }),
      absences: week.absences,
      existingAssignments: week.assignments.flatMap((assignment) => {
        if (assignment.studentId === null || (assignment.source === 'AUTO' && !assignment.locked)) {
          return [];
        }
        return [
          {
            slotId: assignment.slotId,
            studentId: assignment.studentId,
            source: assignment.source === 'AUTO' ? ('AUTO' as const) : ('MANUAL' as const),
            locked: assignment.locked,
          },
        ];
      }),
      historicalBaseline: fairnessBaseline,
    },
  });
  return { context, inputHash: schedulerInputHash(context), dataRevisions, fairnessBaseline };
}

export async function generationContextIsStale(
  week: DutyWeekHydrated,
  session?: ClientSession,
): Promise<boolean> {
  if (week.status !== 'DRAFT') return false;
  if (
    week.requiresGeneration ||
    week.generationContextHash === null ||
    week.generationDataRevisions === null
  ) {
    return true;
  }
  try {
    const current = await buildGenerationContext(week, week.generationRevision, session);
    return current.inputHash !== week.generationContextHash;
  } catch {
    return true;
  }
}
