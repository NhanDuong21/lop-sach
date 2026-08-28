import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../app/create-app.js';
import { connectDatabase, disconnectDatabase } from '../database/connect.js';
import { runDatabaseMigrations } from '../database/migrations/runner.js';
import { createTestOwner, testConfig } from './test-app.js';
import mongoose from 'mongoose';

const apiPort = Number.parseInt(process.env.LOP_SACH_E2E_API_PORT ?? '3000', 10);
const webOrigin = process.env.LOP_SACH_E2E_WEB_ORIGIN ?? 'http://127.0.0.1:4173';
if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65_535) {
  throw new Error('LOP_SACH_E2E_API_PORT must be a valid TCP port.');
}

const replicaSet = await MongoMemoryReplSet.create({
  replSet: { count: 1, storageEngine: 'wiredTiger' },
});
await connectDatabase(replicaSet.getUri('lop_sach_e2e'));
if (!mongoose.connection.db) throw new Error('E2E database unavailable.');
await runDatabaseMigrations(mongoose.connection.db, 'e2e');
await createTestOwner();
const server = createApp(
  { ...testConfig('development'), appOrigin: webOrigin },
  { rateLimits: false },
).listen(apiPort, '127.0.0.1');

let closing = false;
async function shutdown(): Promise<void> {
  if (closing) return;
  closing = true;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await disconnectDatabase();
  await replicaSet.stop();
}

process.once('SIGTERM', () => {
  void shutdown().finally(() => process.exit(0));
});
process.once('SIGINT', () => {
  void shutdown().finally(() => process.exit(0));
});
