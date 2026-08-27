import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterEach, describe, expect, it } from 'vitest';
import { connectDatabase, disconnectDatabase, isDatabaseReady } from '../database/connect.js';

describe('database connection requirements', () => {
  afterEach(async () => {
    await disconnectDatabase();
  });

  it('rejects a standalone MongoDB that cannot run application transactions', async () => {
    const standalone = await MongoMemoryServer.create();
    try {
      await expect(connectDatabase(standalone.getUri('lop_sach_standalone'))).rejects.toThrow(
        'replica set hoặc sharded cluster',
      );
      expect(isDatabaseReady()).toBe(false);
    } finally {
      await standalone.stop();
    }
  }, 120_000);
});
