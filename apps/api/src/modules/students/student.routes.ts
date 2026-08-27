import { StudentCreateSchema, StudentMoveSchema, StudentPatchSchema, VersionMutationSchema } from '@lop-sach/contracts';
import { Router } from 'express';
import { z } from 'zod';
import { authenticatedUser } from '../../middleware/authenticate.js';
import { createStudent, listStudents, moveStudent, patchStudent, setStudentActive } from './student.service.js';

const StudentQuerySchema = z.strictObject({
  groupId: z.string().min(1).optional(),
  active: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
});

export function createStudentRouter(): Router {
  const router = Router();
  router.get('/', async (request, response, next) => {
    try { response.json({ data: await listStudents(authenticatedUser(response).id, StudentQuerySchema.parse(request.query)) }); } catch (error) { next(error); }
  });
  router.post('/', async (request, response, next) => {
    try { response.status(201).json({ data: await createStudent(authenticatedUser(response).id, StudentCreateSchema.parse(request.body)) }); } catch (error) { next(error); }
  });
  router.patch('/:studentId', async (request, response, next) => {
    try { response.json({ data: await patchStudent(authenticatedUser(response).id, request.params.studentId ?? '', StudentPatchSchema.parse(request.body)) }); } catch (error) { next(error); }
  });
  router.post('/:studentId/move', async (request, response, next) => {
    try {
      const input = StudentMoveSchema.parse(request.body);
      response.json({ data: await moveStudent(authenticatedUser(response).id, request.params.studentId ?? '', input.groupId, input.expectedVersion) });
    } catch (error) { next(error); }
  });
  router.post('/:studentId/activate', async (request, response, next) => {
    try {
      const input = VersionMutationSchema.parse(request.body);
      response.json({ data: await setStudentActive(authenticatedUser(response).id, request.params.studentId ?? '', true, input.expectedVersion) });
    } catch (error) { next(error); }
  });
  router.post('/:studentId/deactivate', async (request, response, next) => {
    try {
      const input = VersionMutationSchema.parse(request.body);
      response.json({ data: await setStudentActive(authenticatedUser(response).id, request.params.studentId ?? '', false, input.expectedVersion) });
    } catch (error) { next(error); }
  });
  return router;
}
