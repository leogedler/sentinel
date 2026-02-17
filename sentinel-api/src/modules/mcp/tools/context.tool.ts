import { Client, Campaign, Report } from '../../shared/db/models';
import { UserContext } from './campaigns.tool';

export async function getClientContext(
  args: { slackChannelId: string },
  ctx: UserContext
) {
  const client = await Client.findOne({
    slackChannelId: args.slackChannelId,
    userId: ctx.userId,
  });
  if (!client) throw new Error('No client found for this channel');

  const campaigns = await Campaign.find({ clientId: client._id, isActive: true });
  const recentReports = await Report.find({ clientId: client._id })
    .sort({ createdAt: -1 })
    .limit(5);

  return {
    client: { id: client._id, name: client.name, slackChannelId: client.slackChannelId },
    campaigns: campaigns.map((c) => ({
      id: c._id,
      name: c.name,
      facebookCampaignId: c.facebookCampaignId,
    })),
    recentReports: recentReports.map((r) => ({
      id: r._id,
      content: r.content.substring(0, 200) + '...',
      createdAt: r.createdAt,
      triggeredBy: r.triggeredBy,
    })),
  };
}
