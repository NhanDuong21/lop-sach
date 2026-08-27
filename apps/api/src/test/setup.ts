import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { connectDatabase, disconnectDatabase } from '../database/connect.js';
import { runDatabaseMigrations } from '../database/migrations/runner.js';

let replicaSet: MongoMemoryReplSet;

beforeAll(async () => {
  replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await connectDatabase(replicaSet.getUri('lop_sach_test'));
  if (!mongoose.connection.db) throw new Error('Test database unavailable.');
  await runDatabaseMigrations(mongoose.connection.db, 'test');
}, 120_000);

afterEach(async () => {
  if (mongoose.connection.readyState !== mongoose.ConnectionStates.connected || !mongoose.connection.db) return;
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.filter((collection) => collection.collectionName !== 'schemaMigrations').map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await disconnectDatabase();
  await replicaSet.stop();
});
