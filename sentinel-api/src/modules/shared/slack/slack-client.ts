import { WebClient } from '@slack/web-api';

// Lightweight Slack Web API client for posting messages.
// Works in any service (api, slack-bot) as it only needs SLACK_BOT_TOKEN —
// no Socket Mode or signing secret required.
let client: WebClient | null = null;

export function getSlackWebClient(): WebClient | null {
  if (!process.env.SLACK_BOT_TOKEN) return null;
  if (!client) client = new WebClient(process.env.SLACK_BOT_TOKEN);
  return client;
}
