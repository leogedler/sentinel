import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISchedule extends Document {
  clientId: Types.ObjectId;
  campaignId: Types.ObjectId;
  skillId: Types.ObjectId;
  cronExpression: string;
  timezone: string;
  isActive: boolean;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const scheduleSchema = new Schema<ISchedule>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    skillId: { type: Schema.Types.ObjectId, ref: 'Skill', required: true },
    cronExpression: { type: String, required: true },
    timezone: { type: String, default: 'UTC' },
    isActive: { type: Boolean, default: true },
    lastRunAt: { type: Date },
  },
  { timestamps: true }
);

export const Schedule = mongoose.model<ISchedule>('Schedule', scheduleSchema);
