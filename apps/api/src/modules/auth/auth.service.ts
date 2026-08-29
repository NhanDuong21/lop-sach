import { createHash, randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { SessionModel } from './session.model.js';

const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1_000;

export function normalizeUsername(username: string): string {
  return username.trim().normalize('NFKC').toLocaleLowerCase('vi');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export async function createSession(
  userId: string,
): Promise<{ readonly token: string; readonly expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);
  await SessionModel.create({
    userId,
    tokenHash: hashSessionToken(token),
    createdAt: now,
    lastSeenAt: now,
    expiresAt,
  });
  return { token, expiresAt };
}

export async function authenticateToken(token: string): Promise<{
  readonly id: string;
  readonly username: string;
  readonly displayName: string;
} | null> {
  const [authenticated] = await SessionModel.aggregate<{
    readonly id: string;
    readonly username: string;
    readonly displayName: string;
  }>([
    { $match: { tokenHash: hashSessionToken(token), expiresAt: { $gt: new Date() } } },
    { $limit: 1 },
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    {
      $project: {
        _id: 0,
        id: { $toString: '$user._id' },
        username: '$user.username',
        displayName: '$user.displayName',
      },
    },
  ]);
  return authenticated ?? null;
}

export async function revokeSession(token: string): Promise<void> {
  await SessionModel.deleteOne({ tokenHash: hashSessionToken(token) });
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await SessionModel.deleteMany({ userId });
}
