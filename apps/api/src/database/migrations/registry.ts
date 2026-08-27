import { initialIndexesMigration } from './0001-initial-indexes.js';
import type { DatabaseMigration } from './migration.model.js';

export const DATABASE_MIGRATIONS: readonly DatabaseMigration[] = [initialIndexesMigration];
