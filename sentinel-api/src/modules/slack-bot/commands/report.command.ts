import { Middleware, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { Client, Campaign, Skill } from '../../shared/db/models';
import { User } from '../../shared/db/models';
import { runSkill } from '../../mcp/tools/skills.tool';
import { logger } from '../../shared/utils/logger';

export const reportCommand: Middleware<SlackCommandMiddlewareArgs> = async ({ ack, respond, command }) => {
  await ack();

  const campaignName = command.text.trim();
  if (!campaignName) {
    await respond('Please specify a campaign name: `/sentinel report [campaign_name]`');
    return;
  }

  try {
    const user = await User.findOne({ slackWorkspaceId: command.team_id });
    if (!user) {
      await respond('No Sentinel account linked to this workspace. Please set up your account first.');
      return;
    }

    const client = await Client.findOne({ slackChannelId: command.channel_id, userId: user._id });
    if (!client) {
      await respond('This channel is not linked to any client. Please set up a client for this channel.');
      return;
    }

    const campaign = await Campaign.findOne({
      clientId: client._id,
      name: { $regex: new RegExp(campaignName, 'i') },
    });
    if (!campaign) {
      await respond(`Campaign "${campaignName}" not found for this client.`);
      return;
    }

    const defaultSkill = await Skill.findOne({ name: 'Daily Performance Summary', type: 'system' });
    if (!defaultSkill) {
      await respond('Default skill not found. Please run the seed script.');
      return;
    }

    await respond(`Generating report for *${campaign.name}*... This may take a moment.`);

    const result = await runSkill(
      { skillId: String(defaultSkill._id), campaignId: String(campaign._id) },
      { userId: String(user._id), windsorApiKey: user.windsorApiKey }
    );

    await respond({
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: result.analysis },
        },
        {
          type: 'actions',
          elements: [
            { type: 'button', text: { type: 'plain_text', text: 'Refresh' }, action_id: 'report_refresh', value: `${campaign._id}:${defaultSkill._id}` },
            { type: 'button', text: { type: 'plain_text', text: 'Change Date Range' }, action_id: 'report_date_range', value: String(campaign._id) },
            { type: 'button', text: { type: 'plain_text', text: 'Share' }, action_id: 'report_share', value: String(campaign._id) },
          ],
        },
      ],
    });
  } catch (error) {
    logger.error('Report command error:', error);
    await respond('An error occurred generating the report. Please try again.');
  }
};
