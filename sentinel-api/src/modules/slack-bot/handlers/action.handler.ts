import { App } from '@slack/bolt';
import { User, Skill } from '../../shared/db/models';
import { runSkill } from '../../mcp/tools/skills.tool';
import { logger } from '../../shared/utils/logger';

export function registerActionHandlers(app: App) {
  app.action('report_refresh', async ({ ack, body, respond }) => {
    await ack();

    try {
      const action = (body as any).actions[0];
      const [campaignId, skillId] = action.value.split(':');

      const teamId = body.team?.id;
      const user = await User.findOne({ slackWorkspaceId: teamId });
      if (!user) {
        await respond('User not found.');
        return;
      }

      await respond('Refreshing report...');

      const result = await runSkill(
        { skillId, campaignId },
        { userId: String(user._id), windsorApiKey: user.windsorApiKey }
      );

      await respond({
        replace_original: true,
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: result.analysis } },
          {
            type: 'actions',
            elements: [
              { type: 'button', text: { type: 'plain_text', text: 'Refresh' }, action_id: 'report_refresh', value: `${campaignId}:${skillId}` },
              { type: 'button', text: { type: 'plain_text', text: 'Change Date Range' }, action_id: 'report_date_range', value: campaignId },
              { type: 'button', text: { type: 'plain_text', text: 'Share' }, action_id: 'report_share', value: campaignId },
            ],
          },
        ],
      });
    } catch (error) {
      logger.error('Report refresh error:', error);
      await respond('An error occurred refreshing the report.');
    }
  });

  app.action('report_date_range', async ({ ack, respond }) => {
    await ack();
    await respond('Date range selection is coming in a future update. For now, ask me in natural language: "Show me campaign X performance for last 30 days"');
  });

  app.action('report_share', async ({ ack, body, respond, client }) => {
    await ack();

    try {
      const messageTs = (body as any).message?.ts;
      const channelId = (body as any).channel?.id;

      if (messageTs && channelId) {
        await client.pins.add({ channel: channelId, timestamp: messageTs });
        await respond('Report pinned to channel!');
      } else {
        await respond('Could not share the report.');
      }
    } catch (error) {
      logger.error('Report share error:', error);
      await respond('An error occurred sharing the report.');
    }
  });
}
