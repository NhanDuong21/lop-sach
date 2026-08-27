import { BackupRestoreRequestSchema, BackupUploadSchema } from '@lop-sach/contracts';
import { Router } from 'express';
import { authenticatedUser } from '../../middleware/authenticate.js';
import { exportBackup, restoreBackup, validateBackup } from './backup.service.js';

export function createBackupRouter(): Router {
  const router = Router();
  router.get('/export', async (_request, response, next) => {
    try {
      const backup = await exportBackup(authenticatedUser(response).id);
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="lop-sach-backup-${backup.exportedAt.slice(0, 10)}.json"`,
      );
      response.json({ data: backup });
    } catch (error) {
      next(error);
    }
  });
  router.post('/validate', (request, response, next) => {
    try {
      const input = BackupUploadSchema.parse(request.body);
      response.json({ data: validateBackup(input.backup) });
    } catch (error) {
      next(error);
    }
  });
  router.post('/restore', async (request, response, next) => {
    try {
      const input = BackupRestoreRequestSchema.parse(request.body);
      response.json({
        data: await restoreBackup(
          authenticatedUser(response).id,
          input.backup,
          input.confirmedDigest,
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
