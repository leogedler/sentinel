import Agenda, { Job } from 'agenda';
import { Schedule, Client, User } from '../../db/models';
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
      const slackClient = getSlackWebClient();
      if (slackClient && client.slackChannelId) {
        await slackClient.chat.postMessage({
          token: user.slackAccessToken || process.env.SLACK_BOT_TOKEN,
          channel: client.slackChannelId,
          text: result.analysis,
        });
      }

      // Update last run
      schedule.lastRunAt = new Date();
      await schedule.save();

      logger.info(`Scheduled report completed for schedule ${scheduleId}`);
    } catch (error) {
      logger.error(`run_scheduled_report failed for schedule ${scheduleId}:`, error);
    }
  });
}
