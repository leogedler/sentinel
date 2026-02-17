import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICampaignSnapshot extends Document {
  campaignId: Types.ObjectId;
  date: Date;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  conversionRate: number;
  roas: number;
  reach: number;
  frequency: number;
  fetchedAt: Date;
}

const campaignSnapshotSchema = new Schema<ICampaignSnapshot>({
  campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
  date: { type: Date, required: true },
  spend: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  ctr: { type: Number, default: 0 },
  cpc: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  conversionRate: { type: Number, default: 0 },
  roas: { type: Number, default: 0 },
  reach: { type: Number, default: 0 },
  frequency: { type: Number, default: 0 },
  fetchedAt: { type: Date, default: Date.now },
});

campaignSnapshotSchema.index({ campaignId: 1, date: 1 }, { unique: true });

export const CampaignSnapshot = mongoose.model<ICampaignSnapshot>(
  'CampaignSnapshot',
  campaignSnapshotSchema
);
