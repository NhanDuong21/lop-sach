import type { Db } from 'mongodb';
import { DATABASE_MIGRATIONS } from './registry.js';
import type { AppliedMigration } from './migration.model.js';

export async function runDatabaseMigrations(database: Db, applicationVersion: string): Promise<readonly string[]> {
  const collection = database.collection<AppliedMigration>('schemaMigrations');
  const appliedIds: string[] = [];
  for (const migration of DATABASE_MIGRATIONS) {
    const existing = await collection.findOne({ migrationId: migration.id });
    if (existing) {
      if (existing.checksum !== migration.checksum) {
        throw new Error(`MIGRATION_CHECKSUM_MISMATCH: ${migration.id}`);
      }
      continue;
    }
    await migration.up(database);
    await collection.insertOne({
      migrationId: migration.id,
      checksum: migration.checksum,
      description: migration.description,
      appliedAt: new Date(),
      applicationVersion,
    });
    appliedIds.push(migration.id);
  }
  return appliedIds;
}
