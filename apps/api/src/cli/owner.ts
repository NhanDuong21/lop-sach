import mongoose from 'mongoose';
import { loadConfig } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../database/connect.js';
import { runDatabaseMigrations } from '../database/migrations/runner.js';
import { hashPassword, normalizeUsername, revokeAllSessions } from '../modules/auth/auth.service.js';
import { UserModel } from '../modules/auth/user.model.js';

const username = process.env.OWNER_USERNAME?.trim();
const password = process.env.OWNER_PASSWORD;
const displayName = process.env.OWNER_DISPLAY_NAME?.trim() || 'Lớp phó lao động';
if (!username || !password || password.length < 12) throw new Error('Cần OWNER_USERNAME và OWNER_PASSWORD tối thiểu 12 ký tự. Không truyền password qua CLI argument.');

const config = loadConfig();
await connectDatabase(config.mongoUri);
try {
  if (!mongoose.connection.db) throw new Error('MongoDB connection chưa sẵn sàng.');
  await runDatabaseMigrations(mongoose.connection.db, '0.1.0');
  const normalizedUsername = normalizeUsername(username);
  const existing = await UserModel.findOne({ normalizedUsername });
  const passwordHash = await hashPassword(password);
  if (existing) {
    existing.passwordHash = passwordHash; existing.displayName = displayName; await existing.save();
    await revokeAllSessions(String(existing._id));
    process.stdout.write('Owner password reset; all sessions revoked.\n');
  } else {
    if ((await UserModel.countDocuments()) > 0) throw new Error('V1 chỉ cho phép một owner.');
    await UserModel.create({ username, normalizedUsername, displayName, passwordHash, role: 'OWNER' });
    process.stdout.write('Owner created.\n');
  }
} finally { await disconnectDatabase(); }
