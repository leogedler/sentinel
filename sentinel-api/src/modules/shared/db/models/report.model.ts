import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReport extends Document {
  clientId: Types.ObjectId;
  campaignId: Types.ObjectId;
  skillId: Types.ObjectId;
  content: string;
  slackMessageTs?: string;
  triggeredBy: 'user' | 'schedule';
  createdAt: Date;
}

const reportSchema = new Schema<IReport>({
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
  campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
  skillId: { type: Schema.Types.ObjectId, ref: 'Skill', required: true },
  content: { type: String, required: true },
  slackMessageTs: { type: String },
  triggeredBy: { type: String, enum: ['user', 'schedule'], required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Report = mongoose.model<IReport>('Report', reportSchema);
