import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const { Schema, model, models } = mongoose;

const groupSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  order: { type: Number, required: true, min: 0 },
  active: { type: Boolean, required: true },
}, { _id: false });

const onboardingSchema = new Schema({
  currentStep: { type: Number, required: true, min: 1, max: 6 },
  completedAt: { type: Date, default: null },
}, { _id: false });

const revisionCountersSchema = new Schema({
  classroom: { type: Number, required: true, default: 0 },
  students: { type: Number, required: true, default: 0 },
  tasks: { type: Number, required: true, default: 0 },
}, { _id: false });

const classroomSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  schoolYear: { type: String, required: true },
  timezone: { type: String, enum: ['Asia/Ho_Chi_Minh'], required: true },
  schoolDays: { type: [String], required: true },
  groups: { type: [groupSchema], required: true },
  onboarding: { type: onboardingSchema, required: true },
  revisionCounters: { type: revisionCountersSchema, required: true },
  dataRevision: { type: Number, required: true, default: 0 },
}, { timestamps: true, versionKey: 'version', autoIndex: false, optimisticConcurrency: true });

export type ClassroomDocument = InferSchemaType<typeof classroomSchema>;
export const ClassroomModel = (models.Classroom as Model<ClassroomDocument> | undefined)
  ?? model<ClassroomDocument>('Classroom', classroomSchema, 'classrooms');
