import Anthropic from '@anthropic-ai/sdk';
import { App } from '@slack/bolt';
import { User, Client, ChannelContext } from '../../shared/db/models';
import { getToolDefinitions, executeToolCall } from '../../mcp/server';
import { logger } from '../../shared/utils/logger';

const MAX_HISTORY = 20;
const MAX_TOOL_ITERATIONS = 10;

export function registerMessageHandler(app: App) {
  app.event('app_mention', async ({ event, say, context }) => {
    // Strip the @mention from the beginning of the text
    const channelId = event.channel;
    const userText = event.text.replace(/<@[^>]+>\s*/g, '').trim();

    if (!userText) return;

    try {
      // teamId is provided by Bolt context — no extra API call needed
      const teamId = context.teamId;

      const sentinelUser = await User.findOne({ slackWorkspaceId: teamId });
      if (!sentinelUser) {
        await say('This Slack workspace is not connected to Sentinel yet. Please complete the OAuth flow from the Sentinel dashboard.');
        return;
      }

      const sentinelClient = await Client.findOne({
        slackChannelId: channelId,
        userId: sentinelUser._id,
      });
      if (!sentinelClient) {
        await say(`This channel is not linked to any Sentinel client. Go to the Sentinel dashboard and create or update a client with channel ID \`${channelId}\`.`);
        return;
      }

      // Load or create channel context
      let channelContext = await ChannelContext.findOne({ slackChannelId: channelId });
      if (!channelContext) {
        channelContext = await ChannelContext.create({
          slackChannelId: channelId,
          clientId: sentinelClient._id,
          conversationHistory: [],
        });
      }

      // Add user message to history
      channelContext.conversationHistory.push({
        role: 'user',
        content: userText,
        timestamp: new Date(),
      });

      // Build messages for Claude
      const messages: Anthropic.MessageParam[] = channelContext.conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const anthropic = new Anthropic();
      const tools = getToolDefinitions() as Anthropic.Tool[];

      const userContext = {
        userId: String(sentinelUser._id),
        windsorApiKey: sentinelUser.windsorApiKey,
      };

      let response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: `You are Sentinel, a marketing report assistant. You help marketers analyze Facebook Ads campaigns. You have access to tools to fetch campaign data, run analysis skills, and more. The current client is "${sentinelClient.name}". Be concise and data-driven in your responses. Format responses for Slack (use *bold*, _italic_, and bullet points).`,
        tools,
        messages,
      });

      // Tool call loop
      let iterations = 0;
      while (response.stop_reason === 'tool_use' && iterations < MAX_TOOL_ITERATIONS) {
        iterations++;
        const toolUseBlocks = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
        );

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const toolUse of toolUseBlocks) {
          try {
            const result = await executeToolCall(
              toolUse.name,
              toolUse.input as Record<string, any>,
              userContext
            );
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify(result),
            });
          } catch (error: any) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: `Error: ${error.message}`,
              is_error: true,
            });
          }
        }

        messages.push({ role: 'assistant', content: response.content });
        messages.push({ role: 'user', content: toolResults });

        response = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system: `You are Sentinel, a marketing report assistant. You help marketers analyze Facebook Ads campaigns.`,
          tools,
          messages,
        });
      }

      // Extract final text response
      const textBlocks = response.content.filter(
        (b): b is Anthropic.TextBlock => b.type === 'text'
      );
      const replyText = textBlocks.map((b) => b.text).join('\n') || 'I processed your request but have no text response.';

      await say(replyText);

      // Update conversation history
      channelContext.conversationHistory.push({
        role: 'assistant',
        content: replyText,
        timestamp: new Date(),
      });

      // Trim to rolling window
      if (channelContext.conversationHistory.length > MAX_HISTORY) {
        channelContext.conversationHistory = channelContext.conversationHistory.slice(-MAX_HISTORY);
      }

      await channelContext.save();
    } catch (error) {
      logger.error('Message handler error:', error);
      await say('Sorry, I encountered an error processing your request. Please try again.');
    }
  });
}
