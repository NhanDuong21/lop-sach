import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const taskTemplateSchema = new Schema({
  classroomId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  active: { type: Boolean, required: true, default: true },
  order: { type: Number, required: true, min: 0 },
  schoolDays: { type: [String], required: true },
  requiredStudents: { type: Number, required: true, min: 1, max: 10 },
  workloadLevel: { type: Number, required: true, min: 1, max: 4 },
  eligibilityRule: { type: String, enum: ['ANY', 'PREFER_MALE', 'MALE_ONLY', 'PREFER_FEMALE', 'FEMALE_ONLY'], required: true },
}, { timestamps: true, versionKey: 'version', autoIndex: false, optimisticConcurrency: true });

export type TaskTemplateDocument = InferSchemaType<typeof taskTemplateSchema>;
export const TaskTemplateModel = (models.TaskTemplate as Model<TaskTemplateDocument> | undefined)
  ?? model<TaskTemplateDocument>('TaskTemplate', taskTemplateSchema, 'taskTemplates');
