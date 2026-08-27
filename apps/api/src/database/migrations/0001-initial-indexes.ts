import type { Collection, Db, IndexDescription, IndexDescriptionInfo } from 'mongodb';
import type { DatabaseMigration } from './migration.model.js';

async function ensureIndex(collection: Collection, spec: IndexDescription): Promise<void> {
  const indexes: IndexDescriptionInfo[] = await collection
    .listIndexes()
    .toArray()
    .catch(() => []);
  const current = indexes.find((index) => index.name === spec.name);
  if (current) {
    const desiredKeys = JSON.stringify(spec.key);
    const currentKeys = JSON.stringify(current.key);
    const desiredExpireAfterSeconds = spec.expireAfterSeconds ?? null;
    const currentExpireAfterSeconds = current.expireAfterSeconds ?? null;
    const desiredSparse = spec.sparse ?? false;
    const currentSparse = current.sparse ?? false;
    if (
      desiredKeys !== currentKeys ||
      Boolean(current.unique) !== Boolean(spec.unique) ||
      currentExpireAfterSeconds !== desiredExpireAfterSeconds ||
      currentSparse !== desiredSparse
    ) {
      throw new Error(`Index ${String(spec.name)} đã tồn tại với specification khác.`);
    }
    return;
  }
  await collection.createIndex(spec.key, spec);
}

export const initialIndexesMigration: DatabaseMigration = {
  id: '0001-initial-indexes',
  checksum: 'sha256:8ae95e4c987ea7afec13e8afda997cca05159224d90a25fe4bad9dbd834f2446',
  description: 'Create owner, session, classroom, student, task and duty-week indexes.',
  async up(database: Db): Promise<void> {
    await ensureIndex(database.collection('schemaMigrations'), {
      key: { migrationId: 1 },
      name: 'migration_id_unique',
      unique: true,
    });
    await ensureIndex(database.collection('users'), {
      key: { normalizedUsername: 1 },
      name: 'owner_username_unique',
      unique: true,
    });
    await ensureIndex(database.collection('sessions'), {
      key: { tokenHash: 1 },
      name: 'session_token_hash_unique',
      unique: true,
    });
    await ensureIndex(database.collection('sessions'), {
      key: { userId: 1 },
      name: 'session_user_lookup',
    });
    await ensureIndex(database.collection('sessions'), {
      key: { expiresAt: 1 },
      name: 'session_expiration_ttl',
      expireAfterSeconds: 0,
    });
    await ensureIndex(database.collection('classrooms'), {
      key: { ownerId: 1 },
      name: 'classroom_owner_unique',
      unique: true,
    });
    await ensureIndex(database.collection('students'), {
      key: { classroomId: 1, groupId: 1, active: 1 },
      name: 'student_group_active_lookup',
    });
    await ensureIndex(database.collection('taskTemplates'), {
      key: { classroomId: 1, active: 1, order: 1 },
      name: 'task_active_order_lookup',
    });
    await ensureIndex(database.collection('dutyWeeks'), {
      key: { classroomId: 1, weekStart: 1 },
      name: 'duty_week_start_unique',
      unique: true,
    });
    await ensureIndex(database.collection('dutyWeeks'), {
      key: { classroomId: 1, status: 1, weekStart: -1 },
      name: 'duty_week_status_history',
    });
  },
};
