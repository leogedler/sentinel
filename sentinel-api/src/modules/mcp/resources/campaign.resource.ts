import { Campaign, CampaignSnapshot } from '../../shared/db/models';

export async function getCampaignLatest(campaignId: string) {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw new Error('Campaign not found');

  const snapshot = await CampaignSnapshot.findOne({ campaignId })
    .sort({ date: -1 });

  return {
    campaign: { id: campaign._id, name: campaign.name },
    latestSnapshot: snapshot || null,
  };
}

export async function getCampaignHistory(campaignId: string) {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw new Error('Campaign not found');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const snapshots = await CampaignSnapshot.find({
    campaignId,
    date: { $gte: thirtyDaysAgo },
  }).sort({ date: 1 });

  return {
    campaign: { id: campaign._id, name: campaign.name },
    history: snapshots,
  };
}
