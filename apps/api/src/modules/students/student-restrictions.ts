import {
  DateOnlySchema,
  StudentRestrictionSchema,
  type StudentRestriction,
} from '@lop-sach/contracts';
import type { StudentDocument } from './student.model.js';

export function mapStudentRestrictions(
  restrictions: StudentDocument['restrictions'],
): StudentRestriction[] {
  return StudentRestrictionSchema.array().parse(
    restrictions.map((restriction) => {
      const base = {
        id: String(restriction.id),
        ...(restriction.note ? { note: restriction.note } : {}),
      };
      if (restriction.type === 'NO_HEAVY_TASKS') return { ...base, type: restriction.type };
      if (restriction.type === 'TASK_EXCLUSION')
        return {
          ...base,
          type: restriction.type,
          taskTemplateId: String(restriction.taskTemplateId),
        };
      return {
        ...base,
        type: restriction.type,
        startDate: DateOnlySchema.parse(restriction.startDate),
        endDate: DateOnlySchema.parse(restriction.endDate),
      };
    }),
  );
}
