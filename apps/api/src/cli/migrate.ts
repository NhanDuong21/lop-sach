import mongoose from 'mongoose';
import { loadConfig } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../database/connect.js';
import { runDatabaseMigrations } from '../database/migrations/runner.js';

const config = loadConfig();
await connectDatabase(config.mongoUri);
try {
  if (!mongoose.connection.db) throw new Error('MongoDB connection chưa sẵn sàng.');
  const applied = await runDatabaseMigrations(mongoose.connection.db, '0.1.0');
  process.stdout.write(applied.length ? `Applied: ${applied.join(', ')}\n` : 'Database migrations are current.\n');
} finally { await disconnectDatabase(); }
