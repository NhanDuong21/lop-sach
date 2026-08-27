import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const { Schema, model, models } = mongoose;

const restrictionSchema = new Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['NO_HEAVY_TASKS', 'TASK_EXCLUSION', 'EXEMPT_DATE_RANGE'], required: true },
  note: { type: String },
  taskTemplateId: { type: String },
  startDate: { type: String },
  endDate: { type: String },
}, { _id: false });

const studentSchema = new Schema({
  classroomId: { type: Schema.Types.ObjectId, required: true },
  groupId: { type: String, required: true },
  displayName: { type: String, required: true },
  active: { type: Boolean, required: true, default: true },
  gender: { type: String, enum: ['MALE', 'FEMALE', 'UNSPECIFIED'], required: true, default: 'UNSPECIFIED' },
  participationStart: { type: String, default: null },
  participationEnd: { type: String, default: null },
  restrictions: { type: [restrictionSchema], required: true, default: [] },
}, { timestamps: true, versionKey: 'version', autoIndex: false, optimisticConcurrency: true });

export type StudentDocument = InferSchemaType<typeof studentSchema>;
export const StudentModel = (models.Student as Model<StudentDocument> | undefined)
  ?? model<StudentDocument>('Student', studentSchema, 'students');
