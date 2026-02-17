import { Campaign } from '../../shared/db/models';
import { fetchCampaignData, fetchCampaignHistory } from '../../shared/facebook/windsor.client';
import { UserContext } from './campaigns.tool';

export async function getCampaignKpis(
  args: { campaignId: string; dateRange?: { start: string; end: string } },
  ctx: UserContext
) {
  if (!ctx.windsorApiKey) throw new Error('Windsor API key not configured');

  const campaign = await Campaign.findById(args.campaignId);
  if (!campaign) throw new Error('Campaign not found');

  const kpis = await fetchCampaignData(
    ctx.windsorApiKey,
    campaign.facebookCampaignId,
    args.dateRange
  );

  return kpis;
}

export async function getHistoricalData(
  args: {
    campaignId: string;
    metric: string;
    period: 'daily' | 'weekly' | 'monthly';
    dateRange: { start: string; end: string };
  },
  ctx: UserContext
) {
  if (!ctx.windsorApiKey) throw new Error('Windsor API key not configured');

  const campaign = await Campaign.findById(args.campaignId);
  if (!campaign) throw new Error('Campaign not found');

  const dataPoints = await fetchCampaignHistory(
    ctx.windsorApiKey,
    campaign.facebookCampaignId,
    args.metric,
    args.dateRange
  );

  return { dataPoints };
}
