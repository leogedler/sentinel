import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITokenUsage extends Document {
  userId: Types.ObjectId;
  provider: string;
  aiModel: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  action?: string;
  createdAt: Date;
}

const tokenUsageSchema = new Schema<ITokenUsage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, required: true },
    aiModel: { type: String, required: true },
    inputTokens: { type: Number, required: true, default: 0 },
    outputTokens: { type: Number, required: true, default: 0 },
    totalTokens: { type: Number, required: true, default: 0 },
    action: { type: String },
  },
  { timestamps: true }
);

// Efficient date-range queries per user
tokenUsageSchema.index({ userId: 1, createdAt: -1 });

export const TokenUsage = mongoose.model<ITokenUsage>('TokenUsage', tokenUsageSchema);
