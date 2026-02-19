import { Middleware, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { Client, Campaign, Skill, Schedule, User } from '../../shared/db/models';
import { logger } from '../../shared/utils/logger';

export const scheduleCommand: Middleware<SlackCommandMiddlewareArgs> = async ({ ack, respond, command }) => {
  await ack();

  const args = command.text.trim().split(/\s+/);
  if (args.length < 2) {
    await respond('Usage: `/sentinel schedule [daily|weekly] [time]`\nExample: `/sentinel schedule daily 09:00`');
    return;
  }

  const [frequency, time] = args;
  if (!['daily', 'weekly'].includes(frequency)) {
    await respond('Frequency must be "daily" or "weekly".');
    return;
  }

  const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) {
    await respond('Time must be in HH:MM format (e.g., 09:00).');
    return;
  }

  try {
    const user = await User.findOne({ 'slackWorkspaces.teamId': command.team_id });
    if (!user) {
      await respond('No Sentinel account linked to this workspace.');
      return;
    }

    const client = await Client.findOne({ slackChannelId: command.channel_id, userId: user._id });
    if (!client) {
      await respond('This channel is not linked to any client.');
      return;
    }

    const campaigns = await Campaign.find({ clientId: client._id, isActive: true });
    if (campaigns.length === 0) {
      await respond('No active campaigns found for this client.');
      return;
    }

    const defaultSkill = await Skill.findOne({ name: 'Daily Performance Summary', type: 'system' });
    if (!defaultSkill) {
      await respond('Default skill not found. Please run the seed script.');
      return;
    }

    const [, hours, minutes] = timeMatch;
    const cronExpression =
      frequency === 'daily'
        ? `${minutes} ${hours} * * *`
        : `${minutes} ${hours} * * 1`; // weekly on Monday

    // Create schedule for all active campaigns
    for (const campaign of campaigns) {
      await Schedule.create({
        clientId: client._id,
        campaignId: campaign._id,
        skillId: defaultSkill._id,
        cronExpression,
        timezone: user.timezone,
        isActive: true,
      });
    }

    await respond(
      `Scheduled ${frequency} reports at ${time} for ${campaigns.length} campaign(s) in this channel.`
    );
  } catch (error) {
    logger.error('Schedule command error:', error);
    await respond('An error occurred setting up the schedule. Please try again.');
  }
};
