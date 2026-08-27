import { TaskTemplateCreateSchema, TaskTemplateOrderSchema, TaskTemplatePatchSchema, VersionMutationSchema } from '@lop-sach/contracts';
import { Router } from 'express';
import { authenticatedUser } from '../../middleware/authenticate.js';
import { createTaskTemplate, listTaskTemplates, patchTaskTemplate, reorderTaskTemplates, setTaskTemplateActive } from './task-template.service.js';

export function createTaskTemplateRouter(): Router {
  const router = Router();
  router.get('/', async (_request, response, next) => {
    try { response.json({ data: await listTaskTemplates(authenticatedUser(response).id) }); } catch (error) { next(error); }
  });
  router.post('/', async (request, response, next) => {
    try { response.status(201).json({ data: await createTaskTemplate(authenticatedUser(response).id, TaskTemplateCreateSchema.parse(request.body)) }); } catch (error) { next(error); }
  });
  router.patch('/:taskId', async (request, response, next) => {
    try { response.json({ data: await patchTaskTemplate(authenticatedUser(response).id, request.params.taskId ?? '', TaskTemplatePatchSchema.parse(request.body)) }); } catch (error) { next(error); }
  });
  router.post('/:taskId/activate', async (request, response, next) => {
    try {
      const input = VersionMutationSchema.parse(request.body);
      response.json({ data: await setTaskTemplateActive(authenticatedUser(response).id, request.params.taskId ?? '', true, input.expectedVersion) });
    } catch (error) { next(error); }
  });
  router.post('/:taskId/deactivate', async (request, response, next) => {
    try {
      const input = VersionMutationSchema.parse(request.body);
      response.json({ data: await setTaskTemplateActive(authenticatedUser(response).id, request.params.taskId ?? '', false, input.expectedVersion) });
    } catch (error) { next(error); }
  });
  router.put('/order', async (request, response, next) => {
    try {
      const input = TaskTemplateOrderSchema.parse(request.body);
      response.json({ data: await reorderTaskTemplates(authenticatedUser(response).id, input.taskIds, input.expectedTasksRevision) });
    } catch (error) { next(error); }
  });
  return router;
}
