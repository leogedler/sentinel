import { SlashCommand, Middleware, SlackCommandMiddlewareArgs } from '@slack/bolt';

export const helpCommand: Middleware<SlackCommandMiddlewareArgs> = async ({ ack, respond }) => {
  await ack();
  await respond({
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Sentinel — Marketing Report Bot*\n\nAvailable commands:',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            '`/sentinel report [campaign_name]` — Generate a report for a specific campaign',
            '`/sentinel compare [campaign1] [campaign2]` — Compare two campaigns side by side',
            '`/sentinel schedule [daily|weekly] [time]` — Set up a recurring report schedule',
            '`/sentinel skills` — List available Skills',
            '`/sentinel help` — Show this help message',
          ].join('\n'),
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'You can also send natural language messages in any client channel, and I\'ll analyze your campaigns using AI.',
        },
      },
    ],
  });
};
