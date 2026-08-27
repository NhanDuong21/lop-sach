import { ClassroomPatchSchema, ClassroomUpsertSchema, GroupCreateSchema, GroupPatchSchema, VersionMutationSchema } from '@lop-sach/contracts';
import { Router } from 'express';
import { authenticatedUser } from '../../middleware/authenticate.js';
import { createClassroom, createGroup, getClassroom, patchClassroom, patchGroup, setGroupActive } from './classroom.service.js';

export function createClassroomRouter(): Router {
  const router = Router();
  router.get('/', async (_request, response, next) => {
    try { response.json({ data: await getClassroom(authenticatedUser(response).id) }); } catch (error) { next(error); }
  });
  router.put('/', async (request, response, next) => {
    try { response.status(201).json({ data: await createClassroom(authenticatedUser(response).id, ClassroomUpsertSchema.parse(request.body)) }); } catch (error) { next(error); }
  });
  router.patch('/', async (request, response, next) => {
    try { response.json({ data: await patchClassroom(authenticatedUser(response).id, ClassroomPatchSchema.parse(request.body)) }); } catch (error) { next(error); }
  });
  router.post('/groups', async (request, response, next) => {
    try {
      const input = GroupCreateSchema.parse(request.body);
      response.status(201).json({ data: await createGroup(authenticatedUser(response).id, input.name, input.expectedVersion) });
    } catch (error) { next(error); }
  });
  router.patch('/groups/:groupId', async (request, response, next) => {
    try { response.json({ data: await patchGroup(authenticatedUser(response).id, request.params.groupId ?? '', GroupPatchSchema.parse(request.body)) }); } catch (error) { next(error); }
  });
  router.post('/groups/:groupId/activate', async (request, response, next) => {
    try {
      const input = VersionMutationSchema.parse(request.body);
      response.json({ data: await setGroupActive(authenticatedUser(response).id, request.params.groupId ?? '', true, input.expectedVersion) });
    } catch (error) { next(error); }
  });
  router.post('/groups/:groupId/deactivate', async (request, response, next) => {
    try {
      const input = VersionMutationSchema.parse(request.body);
      response.json({ data: await setGroupActive(authenticatedUser(response).id, request.params.groupId ?? '', false, input.expectedVersion) });
    } catch (error) { next(error); }
  });
  return router;
}
