import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const sessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  tokenHash: { type: String, required: true },
  createdAt: { type: Date, required: true },
  lastSeenAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
}, { versionKey: false, autoIndex: false });

export type SessionDocument = InferSchemaType<typeof sessionSchema>;
export const SessionModel = (models.Session as Model<SessionDocument> | undefined) ?? model<SessionDocument>('Session', sessionSchema, 'sessions');
