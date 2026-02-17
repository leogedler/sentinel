import { Campaign, Client } from '../../shared/db/models';

export interface UserContext {
  userId: string;
  windsorApiKey?: string;
}

export async function getCampaigns(
  args: { clientId: string },
  ctx: UserContext
) {
  const client = await Client.findOne({ _id: args.clientId, userId: ctx.userId });
  if (!client) throw new Error('Client not found');

  const campaigns = await Campaign.find({ clientId: args.clientId, isActive: true });
  return {
    campaigns: campaigns.map((c) => ({
      id: c._id,
      name: c.name,
      facebookCampaignId: c.facebookCampaignId,
      isActive: c.isActive,
    })),
  };
}

export async function compareCampaigns(
  args: { campaignIds: string[]; dateRange?: { start: string; end: string } },
  ctx: UserContext
) {
  const { fetchCampaignData } = await import('../../shared/facebook/windsor.client');

  const campaigns = await Campaign.find({ _id: { $in: args.campaignIds } });
  if (!ctx.windsorApiKey) throw new Error('Windsor API key not configured');

  const comparisons = await Promise.all(
    campaigns.map(async (campaign) => {
      const kpis = await fetchCampaignData(
        ctx.windsorApiKey!,
        campaign.facebookCampaignId,
        args.dateRange
      );
      return { campaignId: String(campaign._id), name: campaign.name, kpis };
    })
  );

  return { comparisons };
}
