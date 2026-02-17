import { getCampaigns, compareCampaigns, UserContext } from './tools/campaigns.tool';
import { getCampaignKpis, getHistoricalData } from './tools/kpis.tool';
import { listSkills, runSkill } from './tools/skills.tool';
import { getClientContext } from './tools/context.tool';

// Tool definitions in Anthropic API format (used by Slack bot for Claude calls)
export function getToolDefinitions() {
  return [
    {
      name: 'get_campaigns',
      description: 'Retrieve all campaigns for a given client',
      input_schema: {
        type: 'object' as const,
        properties: {
          clientId: { type: 'string', description: 'The client ID' },
        },
        required: ['clientId'],
      },
    },
    {
      name: 'get_campaign_kpis',
      description: 'Fetch current KPIs for a campaign from Windsor.ai',
      input_schema: {
        type: 'object' as const,
        properties: {
          campaignId: { type: 'string', description: 'The campaign ID' },
          dateRange: {
            type: 'object',
            properties: {
              start: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
              end: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            },
          },
        },
        required: ['campaignId'],
      },
    },
    {
      name: 'compare_campaigns',
      description: 'Compare KPIs across multiple campaigns',
      input_schema: {
        type: 'object' as const,
        properties: {
          campaignIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of campaign IDs to compare',
          },
          dateRange: {
            type: 'object',
            properties: {
              start: { type: 'string' },
              end: { type: 'string' },
            },
          },
        },
        required: ['campaignIds'],
      },
    },
    {
      name: 'get_historical_data',
      description: 'Get historical performance data for trend analysis',
      input_schema: {
        type: 'object' as const,
        properties: {
          campaignId: { type: 'string' },
          metric: { type: 'string', description: 'Metric name (spend, ctr, conversions, etc.)' },
          period: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
          dateRange: {
            type: 'object',
            properties: {
              start: { type: 'string' },
              end: { type: 'string' },
            },
            required: ['start', 'end'],
          },
        },
        required: ['campaignId', 'metric', 'period', 'dateRange'],
      },
    },
    {
      name: 'run_skill',
      description: 'Execute a Skill (prompt template) with campaign data as context',
      input_schema: {
        type: 'object' as const,
        properties: {
          skillId: { type: 'string' },
          campaignId: { type: 'string' },
          additionalContext: { type: 'string' },
        },
        required: ['skillId', 'campaignId'],
      },
    },
    {
      name: 'list_skills',
      description: 'List all available Skills',
      input_schema: {
        type: 'object' as const,
        properties: {},
      },
    },
    {
      name: 'get_client_context',
      description: 'Get full context for a client (campaigns, recent reports, settings)',
      input_schema: {
        type: 'object' as const,
        properties: {
          slackChannelId: { type: 'string', description: 'Slack channel ID' },
        },
        required: ['slackChannelId'],
      },
    },
  ];
}

// Direct tool execution (called by Slack bot, avoids stdio complexity)
export async function executeToolCall(
  toolName: string,
  args: Record<string, any>,
  userContext: UserContext
): Promise<any> {
  switch (toolName) {
    case 'get_campaigns':
      return getCampaigns(args as any, userContext);
    case 'get_campaign_kpis':
      return getCampaignKpis(args as any, userContext);
    case 'compare_campaigns':
      return compareCampaigns(args as any, userContext);
    case 'get_historical_data':
      return getHistoricalData(args as any, userContext);
    case 'run_skill':
      return runSkill(args as any, userContext);
    case 'list_skills':
      return listSkills(userContext);
    case 'get_client_context':
      return getClientContext(args as any, userContext);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
