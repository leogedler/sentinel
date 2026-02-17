import { Middleware, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { Client, Campaign, User } from '../../shared/db/models';
import { compareCampaigns } from '../../mcp/tools/campaigns.tool';
import { logger } from '../../shared/utils/logger';

export const compareCommand: Middleware<SlackCommandMiddlewareArgs> = async ({ ack, respond, command }) => {
  await ack();

  const args = command.text.trim().split(/\s+/);
  if (args.length < 2) {
    await respond('Please specify two campaign names: `/sentinel compare [campaign1] [campaign2]`');
    return;
  }

  try {
    const user = await User.findOne({ slackWorkspaceId: command.team_id });
    if (!user) {
      await respond('No Sentinel account linked to this workspace.');
      return;
    }

    const client = await Client.findOne({ slackChannelId: command.channel_id, userId: user._id });
    if (!client) {
      await respond('This channel is not linked to any client.');
      return;
    }

    const campaigns = await Promise.all(
      args.map((name) =>
        Campaign.findOne({ clientId: client._id, name: { $regex: new RegExp(name, 'i') } })
      )
    );

    const missing = args.filter((_, i) => !campaigns[i]);
    if (missing.length > 0) {
      await respond(`Campaign(s) not found: ${missing.join(', ')}`);
      return;
    }

    await respond('Comparing campaigns... This may take a moment.');

    const result = await compareCampaigns(
      { campaignIds: campaigns.map((c) => String(c!._id)) },
      { userId: String(user._id), windsorApiKey: user.windsorApiKey }
    );

    const text = result.comparisons
      .map((c) => `*${c.name}*\nSpend: $${c.kpis.spend.toFixed(2)} | CTR: ${c.kpis.ctr.toFixed(2)}% | ROAS: ${c.kpis.roas.toFixed(2)} | Conversions: ${c.kpis.conversions}`)
      .join('\n\n');

    await respond({
      blocks: [
        { type: 'header', text: { type: 'plain_text', text: 'Campaign Comparison' } },
        { type: 'section', text: { type: 'mrkdwn', text } },
      ],
    });
  } catch (error) {
    logger.error('Compare command error:', error);
    await respond('An error occurred comparing campaigns. Please try again.');
  }
};
