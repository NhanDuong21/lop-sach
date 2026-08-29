import {
  AssignmentLockSchema,
  AssignmentSwapSchema,
  AssignmentWriteSchema,
  CompleteDutyWeekSchema,
  DateOnlySchema,
  DutyWeekAbsencesWriteSchema,
  DutyWeekCreateSchema,
  DutyWeekPatchSchema,
  DutyWeekStatusSchema,
  GenerateDutyWeekSchema,
  ReplacementWriteSchema,
  TaskOccurrenceCreateSchema,
  TaskOccurrencePatchSchema,
  VersionedDutyWeekMutationSchema,
} from '@lop-sach/contracts';
import { Router } from 'express';
import { z } from 'zod';
import { authenticatedUser } from '../../middleware/authenticate.js';
import {
  completeDutyWeek,
  createDutyWeek,
  createTaskOccurrence,
  deleteDutyWeek,
  deleteTaskOccurrence,
  generateDutyWeek,
  getDutyWeekOverview,
  getDutyWeek,
  getDutyWeekGenerationContext,
  getReplacementSuggestions,
  getCompletionOptions,
  historyMetrics,
  listHistorySummary,
  listDutyWeeks,
  patchDutyWeek,
  patchTaskOccurrence,
  preflightDutyWeek,
  publishDutyWeek,
  replaceAbsences,
  replaceAssignment,
  setAssignmentLock,
  swapAssignments,
  writeAssignment,
} from './duty-week.service.js';

const DutyWeekListQuerySchema = z.strictObject({
  status: DutyWeekStatusSchema.optional(),
  from: DateOnlySchema.optional(),
  to: DateOnlySchema.optional(),
});
const DutyWeekOverviewQuerySchema = z.strictObject({ weekStart: DateOnlySchema });

export function createDutyWeekRouter(): Router {
  const router = Router();
  router.get('/', async (request, response, next) => {
    try {
      response.json({
        data: await listDutyWeeks(
          authenticatedUser(response).id,
          DutyWeekListQuerySchema.parse(request.query),
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.post('/', async (request, response, next) => {
    try {
      response.status(201).json({
        data: await createDutyWeek(
          authenticatedUser(response).id,
          DutyWeekCreateSchema.parse(request.body),
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.get('/overview', async (request, response, next) => {
    try {
      const input = DutyWeekOverviewQuerySchema.parse(request.query);
      response.json({
        data: await getDutyWeekOverview(authenticatedUser(response).id, input.weekStart),
      });
    } catch (error) {
      next(error);
    }
  });
  router.get('/:weekId', async (request, response, next) => {
    try {
      response.json({
        data: await getDutyWeek(authenticatedUser(response).id, request.params.weekId ?? ''),
      });
    } catch (error) {
      next(error);
    }
  });
  router.patch('/:weekId', async (request, response, next) => {
    try {
      response.json({
        data: await patchDutyWeek(
          authenticatedUser(response).id,
          request.params.weekId ?? '',
          DutyWeekPatchSchema.parse(request.body),
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.delete('/:weekId', async (request, response, next) => {
    try {
      const input = VersionedDutyWeekMutationSchema.parse(request.body);
      await deleteDutyWeek(
        authenticatedUser(response).id,
        request.params.weekId ?? '',
        input.expectedVersion,
      );
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  router.put('/:weekId/absences', async (request, response, next) => {
    try {
      const input = DutyWeekAbsencesWriteSchema.parse(request.body);
      response.json({
        data: await replaceAbsences(
          authenticatedUser(response).id,
          request.params.weekId ?? '',
          input.absences,
          input.expectedVersion,
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.post('/:weekId/task-occurrences', async (request, response, next) => {
    try {
      response.status(201).json({
        data: await createTaskOccurrence(
          authenticatedUser(response).id,
          request.params.weekId ?? '',
          TaskOccurrenceCreateSchema.parse(request.body),
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.patch('/:weekId/task-occurrences/:occurrenceId', async (request, response, next) => {
    try {
      response.json({
        data: await patchTaskOccurrence(
          authenticatedUser(response).id,
          request.params.weekId ?? '',
          request.params.occurrenceId ?? '',
          TaskOccurrencePatchSchema.parse(request.body),
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.delete('/:weekId/task-occurrences/:occurrenceId', async (request, response, next) => {
    try {
      const input = VersionedDutyWeekMutationSchema.parse(request.body);
      response.json({
        data: await deleteTaskOccurrence(
          authenticatedUser(response).id,
          request.params.weekId ?? '',
          request.params.occurrenceId ?? '',
          input.expectedVersion,
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.get('/:weekId/generation-context', async (request, response, next) => {
    try {
      response.json({
        data: await getDutyWeekGenerationContext(
          authenticatedUser(response).id,
          request.params.weekId ?? '',
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.post('/:weekId/generate', async (request, response, next) => {
    try {
      response.json({
        data: await generateDutyWeek(
          authenticatedUser(response).id,
          request.params.weekId ?? '',
          GenerateDutyWeekSchema.parse(request.body),
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.post('/:weekId/preflight', async (request, response, next) => {
    try {
      const input = VersionedDutyWeekMutationSchema.parse(request.body);
      response.json({
        data: await preflightDutyWeek(
          authenticatedUser(response).id,
          request.params.weekId ?? '',
          input.expectedVersion,
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.put('/:weekId/slots/:slotId/assignment', async (request, response, next) => {
    try {
      const input = AssignmentWriteSchema.parse(request.body);
      response.json({
        data: await writeAssignment(
          authenticatedUser(response).id,
          request.params.weekId ?? '',
          request.params.slotId ?? '',
          input.studentId,
          input.expectedVersion,
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.patch('/:weekId/slots/:slotId/lock', async (request, response, next) => {
    try {
      const input = AssignmentLockSchema.parse(request.body);
      response.json({
        data: await setAssignmentLock(
          authenticatedUser(response).id,
          request.params.weekId ?? '',
          request.params.slotId ?? '',
          input.locked,
          input.expectedVersion,
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.get('/:weekId/slots/:slotId/replacements', async (request, response, next) => {
    try {
      response.json({
        data: await getReplacementSuggestions(
          authenticatedUser(response).id,
          request.params.weekId ?? '',
          request.params.slotId ?? '',
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.post('/:weekId/slots/:slotId/replace', async (request, response, next) => {
    try {
      const input = ReplacementWriteSchema.parse(request.body);
      response.json({
        data: await replaceAssignment(
          authenticatedUser(response).id,
          request.params.weekId ?? '',
          request.params.slotId ?? '',
          input.studentId,
          input.expectedVersion,
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.post('/:weekId/assignments/swap', async (request, response, next) => {
    try {
      const input = AssignmentSwapSchema.parse(request.body);
      response.json({
        data: await swapAssignments(
          authenticatedUser(response).id,
          request.params.weekId ?? '',
          input.firstSlotId,
          input.secondSlotId,
          input.expectedVersion,
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.post('/:weekId/publish', async (request, response, next) => {
    try {
      const input = VersionedDutyWeekMutationSchema.parse(request.body);
      response.json({
        data: await publishDutyWeek(
          authenticatedUser(response).id,
          request.params.weekId ?? '',
          input.expectedVersion,
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.get('/:weekId/completion-options', async (request, response, next) => {
    try {
      response.json({
        data: await getCompletionOptions(
          authenticatedUser(response).id,
          request.params.weekId ?? '',
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.post('/:weekId/complete', async (request, response, next) => {
    try {
      const input = CompleteDutyWeekSchema.parse(request.body);
      response.json({
        data: await completeDutyWeek(
          authenticatedUser(response).id,
          request.params.weekId ?? '',
          input.actualPerformers,
          input.expectedVersion,
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  return router;
}

export function createHistoryRouter(): Router {
  const router = Router();
  router.get('/summary', async (_request, response, next) => {
    try {
      response.json({ data: await listHistorySummary(authenticatedUser(response).id) });
    } catch (error) {
      next(error);
    }
  });
  router.get('/metrics', async (_request, response, next) => {
    try {
      response.json({ data: await historyMetrics(authenticatedUser(response).id) });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
