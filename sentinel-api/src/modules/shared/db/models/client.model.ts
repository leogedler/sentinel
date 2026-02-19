import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IClient extends Document {
  userId: Types.ObjectId;
  name: string;
  slackChannelId: string;
  windsorAccountId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<IClient>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slackChannelId: { type: String, required: false, default: '' },
    windsorAccountId: { type: String, required: false, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Client = mongoose.model<IClient>('Client', clientSchema);
