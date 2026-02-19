import { App } from '@slack/bolt';
import { logger } from '../shared/utils/logger';
import { User } from '../shared/db/models';
import { helpCommand } from './commands/help.command';
import { reportCommand } from './commands/report.command';
import { compareCommand } from './commands/compare.command';
import { scheduleCommand } from './commands/schedule.command';
import { registerMessageHandler } from './handlers/message.handler';
import { registerActionHandlers } from './handlers/action.handler';

let slackApp: App | null = null;

export async function startSlackBot(): Promise<App> {
  slackApp = new App({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
    // Multi-workspace: resolve the bot token for each incoming teamId
    authorize: async ({ teamId }) => {
      const user = await User.findOne({ 'slackWorkspaces.teamId': teamId });
      const workspace = user?.slackWorkspaces.find((w) => w.teamId === teamId);
      if (!workspace) {
        throw new Error(`No Sentinel installation found for Slack workspace ${teamId}`);
      }
      return {
        botToken: workspace.accessToken,
        botUserId: workspace.botUserId,
      };
    },
  });

  // Register slash command with sub-routing
  slackApp.command('/sentinel', async (args) => {
    const subcommand = args.command.text.split(/\s+/)[0]?.toLowerCase();

    // Strip subcommand from text for handlers
    const originalText = args.command.text;
    args.command.text = originalText.replace(/^\S+\s*/, '');

    switch (subcommand) {
      case 'help':
        return helpCommand(args);
      case 'report':
        return reportCommand(args);
      case 'compare':
        return compareCommand(args);
      case 'schedule':
        return scheduleCommand(args);
      case 'skills': {
        await args.ack();
        const { listSkills } = await import('../mcp/tools/skills.tool');
        const user = await User.findOne({ 'slackWorkspaces.teamId': args.command.team_id });
        if (!user) {
          await args.respond('No Sentinel account linked to this workspace.');
          return;
        }
        const result = await listSkills({ userId: String(user._id) });
        const skillList = result.skills
          .map((s) => `• *${s.name}* (${s.category}) — ${s.description}`)
          .join('\n');
        await args.respond(`*Available Skills:*\n${skillList}`);
        return;
      }
      default:
        await args.ack();
        await args.respond(
          'Unknown command. Use `/sentinel help` to see available commands.'
        );
    }
  });

  // Register handlers
  registerMessageHandler(slackApp);
  registerActionHandlers(slackApp);

  await slackApp.start();
  logger.info('Slack bot started in Socket Mode (multi-workspace)');

  return slackApp;
}

export function getSlackApp(): App | null {
  return slackApp;
}
