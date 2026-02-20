import { getCampaigns, compareCampaigns, UserContext } from './tools/campaigns.tool';
import { getCampaignKpis, getHistoricalData } from './tools/kpis.tool';
import { listSkills, runSkill } from './tools/skills.tool';
import { getClientContext } from './tools/context.tool';
import { syncClientsCampaignsTool } from './tools/sync.tool';
import { createScheduleTool } from './tools/schedule.tool';
import { searchClientsCampaigns } from './tools/search.tool';

// Tool definitions — provider-agnostic schema (input_schema format; compatible with both Anthropic and Gemini)
export function getToolDefinitions() {
  return [
    {
      name: 'search_clients_campaigns',
      description: 'Search for clients and/or campaigns by name (partial, case-insensitive) or exact MongoDB ID. ALWAYS call this first when the user refers to a client or campaign by name and you do not already have its ID. Returns matching IDs you can pass to other tools.',
      input_schema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: 'Name substring to search for, or exact MongoDB ID',
          },
          type: {
            type: 'string',
            enum: ['client', 'campaign', 'both'],
            description: 'Limit results to clients, campaigns, or both (default: both)',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_campaigns',
      description: 'Retrieve all campaigns for a given client. Use search_clients_campaigns first if you only have a client name.',
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
      description: 'Fetch current KPIs for a campaign from Windsor.ai. Use search_clients_campaigns first if you only have a campaign name.',
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
      description: 'Compare KPIs across multiple campaigns. Use search_clients_campaigns first to resolve campaign names to IDs.',
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
      description: 'Execute a Skill (prompt template) with campaign data as context. Use search_clients_campaigns to resolve campaign names, and list_skills to resolve skill names.',
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
    {
      name: 'create_schedule',
      description: 'Set up a recurring report for one or more campaigns. Use when the user asks to schedule, automate, or set up recurring reports. First call get_campaigns to resolve campaign IDs if needed, and list_skills to resolve a skill ID if the user specifies one.',
      input_schema: {
        type: 'object' as const,
        properties: {
          campaignIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs of the campaigns to schedule reports for',
          },
          frequency: {
            type: 'string',
            enum: ['daily', 'weekly'],
            description: 'How often to run the report',
          },
          time: {
            type: 'string',
            description: 'Time to run in HH:MM format (UTC), e.g. "09:00"',
          },
          skillId: {
            type: 'string',
            description: 'ID of the Skill to use. Omit to use the default Daily Performance Summary.',
          },
        },
        required: ['campaignIds', 'frequency', 'time'],
      },
    },
    {
      name: 'sync_clients_and_campaigns',
      description: 'Fetch all clients (ad accounts) and campaigns from Windsor.ai and sync them into Sentinel. Use when the user asks to import, fetch, or sync their campaigns.',
      input_schema: {
        type: 'object' as const,
        properties: {},
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
    case 'search_clients_campaigns':
      return searchClientsCampaigns(args as any, userContext);
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
    case 'create_schedule':
      return createScheduleTool(args as any, userContext);
    case 'sync_clients_and_campaigns':
      return syncClientsCampaignsTool(args as any, userContext);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
