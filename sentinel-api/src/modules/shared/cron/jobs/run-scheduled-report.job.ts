import Agenda, { Job } from 'agenda';
import { Schedule, Client, User, ChannelContext } from '../../db/models';
import { runSkill } from '../../../mcp/tools/skills.tool';
import { getSlackWebClient } from '../../slack/slack-client';
import { logger } from '../../utils/logger';

export function defineRunScheduledReportJob(agenda: Agenda) {
  agenda.define('run_scheduled_report', async (job: Job) => {
    const { scheduleId } = job.attrs.data as { scheduleId: string };

    try {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule || !schedule.isActive) return;

      const client = await Client.findById(schedule.clientId);
      if (!client) return;

      const user = await User.findById(client.userId);
      if (!user) return;

      const result = await runSkill(
        {
          skillId: String(schedule.skillId),
          campaignId: String(schedule.campaignId),
        },
        { userId: String(user._id), windsorApiKey: user.windsorApiKey }
      );

      // Post to Slack
      if (client.slackChannelId) {
        const channelCtx = await ChannelContext.findOne({ slackChannelId: client.slackChannelId });
        const workspace = channelCtx
          ? user.slackWorkspaces.find((w) => w.teamId === channelCtx.teamId)
          : user.slackWorkspaces[0];
        const slackClient = getSlackWebClient();
        if (slackClient && workspace) {
          await slackClient.chat.postMessage({
            token: workspace.accessToken,
            channel: client.slackChannelId,
            text: result.analysis,
          });
        }
      }

      // Update last run
      schedule.lastRunAt = new Date();
      await schedule.save();

      logger.info('Scheduled report completed', { scheduleId });
    } catch (error) {
      logger.error('run_scheduled_report failed', error, { scheduleId });
    }
  });
}
