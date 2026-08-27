import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const { Schema, model, models } = mongoose;

const userSchema = new Schema(
  {
    username: { type: String, required: true },
    normalizedUsername: { type: String, required: true },
    displayName: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['OWNER'], default: 'OWNER', required: true },
  },
  { timestamps: true, autoIndex: false },
);

export type UserDocument = InferSchemaType<typeof userSchema>;
export const UserModel =
  (models.User as Model<UserDocument> | undefined) ??
  model<UserDocument>('User', userSchema, 'users');
