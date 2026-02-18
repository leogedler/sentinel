import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IChannelContext extends Document {
  slackChannelId: string;
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
    slackChannelId: { type: String, required: true, unique: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: false },
    conversationHistory: [conversationMessageSchema],
  },
  { timestamps: true }
);

export const ChannelContext = mongoose.model<IChannelContext>(
  'ChannelContext',
  channelContextSchema
);
