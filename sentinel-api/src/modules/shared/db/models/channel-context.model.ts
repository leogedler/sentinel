import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IChannelContext extends Document {
  slackChannelId: string;
  teamId: string;
  clientId?: Types.ObjectId;
  conversationHistory: IConversationMessage[];
  updatedAt: Date;
}

const conversationMessageSchema = new Schema<IConversationMessage>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const channelContextSchema = new Schema<IChannelContext>(
  {
    slackChannelId: { type: String, required: true },
    teamId: { type: String, required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: false },
    conversationHistory: [conversationMessageSchema],
  },
  { timestamps: true }
);

// Compound unique index: one conversation history per channel per workspace
channelContextSchema.index({ slackChannelId: 1, teamId: 1 }, { unique: true });

export const ChannelContext = mongoose.model<IChannelContext>(
  'ChannelContext',
  channelContextSchema
);
