import './setup.js';
import mongoose from 'mongoose';
import type { IndexDescriptionInfo } from 'mongodb';
import { describe, expect, it } from 'vitest';
import { runDatabaseMigrations } from '../database/migrations/runner.js';
import type { AppliedMigration } from '../database/migrations/migration.model.js';

describe('forward-only migrations', () => {
  it('is idempotent and records stable IDs', async () => {
    if (!mongoose.connection.db) throw new Error('Database unavailable.');
    expect(await runDatabaseMigrations(mongoose.connection.db, 'test')).toEqual([]);
    const records = await mongoose.connection.db
      .collection<AppliedMigration>('schemaMigrations')
      .find()
      .toArray();
    expect(records.map((record) => record.migrationId)).toContain('0001-initial-indexes');
  });

  it('never accepts an index with the same name and a different specification', async () => {
    if (!mongoose.connection.db) throw new Error('Database unavailable.');
    const sessions = mongoose.connection.db.collection('sessions');
    await sessions.dropIndex('session_expiration_ttl');
    await sessions.createIndex(
      { expiresAt: 1 },
      { name: 'session_expiration_ttl', expireAfterSeconds: 3_600 },
    );
    await mongoose.connection.db
      .collection('schemaMigrations')
      .deleteOne({ migrationId: '0001-initial-indexes' });
    await expect(runDatabaseMigrations(mongoose.connection.db, 'test')).rejects.toThrow(
      'specification khác',
    );
    const indexes = (await sessions.listIndexes().toArray()) as unknown as IndexDescriptionInfo[];
    const index = indexes.find((candidate) => candidate.name === 'session_expiration_ttl');
    expect(index?.expireAfterSeconds).toBe(3_600);
  });
});
