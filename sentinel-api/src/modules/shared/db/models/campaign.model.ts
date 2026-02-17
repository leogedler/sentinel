import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICampaign extends Document {
  clientId: Types.ObjectId;
  name: string;
  facebookCampaignId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new Schema<ICampaign>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    name: { type: String, required: true, trim: true },
    facebookCampaignId: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Campaign = mongoose.model<ICampaign>('Campaign', campaignSchema);
