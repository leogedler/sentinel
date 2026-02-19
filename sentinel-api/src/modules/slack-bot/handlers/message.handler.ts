import Anthropic from '@anthropic-ai/sdk';
import { App } from '@slack/bolt';
import { User, Client, ChannelContext } from '../../shared/db/models';
import { getToolDefinitions, executeToolCall } from '../../mcp/server';
import { logger } from '../../shared/utils/logger';

const MAX_HISTORY = 20;
const MAX_TOOL_ITERATIONS = 10;
const MAX_CLAUDE_RETRIES = 3;
const THINKING_THRESHOLD_MS = 5000;

const THINKING_MESSAGES = [
  '⏳ On it! This one needs a moment of thought...',
  '🔍 Digging into your data, hang tight...',
  '⚙️ Working on it! I\'ll have something for you shortly...',
  '📊 Crunching the numbers, give me a sec...',
  '🧠 Thinking this through, won\'t be long...',
];

async function createMessageWithRetry(
  anthropic: Anthropic,
  params: Parameters<Anthropic['messages']['create']>[0],
  retries = MAX_CLAUDE_RETRIES
): Promise<Anthropic.Message> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await anthropic.messages.create(params) as Anthropic.Message;
    } catch (error: any) {
      const isOverloaded = error?.status === 529 || error?.error?.error?.type === 'overloaded_error';
      if (isOverloaded && attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        logger.warn(`Anthropic overloaded (attempt ${attempt}/${retries}), retrying in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Unreachable');
}

export function registerMessageHandler(app: App) {
  app.event('app_mention', async ({ event, say, context, client }) => {
    // Strip the @mention from the beginning of the text
    const channelId = event.channel;
    const userText = event.text.replace(/<@[^>]+>\s*/g, '').trim();

    if (!userText) return;

    let thinkingTimer: ReturnType<typeof setTimeout> | undefined;
    let thinkingTs: string | undefined;

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

      // Load or create channel context
      let channelContext = await ChannelContext.findOne({ slackChannelId: channelId });
      if (!channelContext) {
        const contextData: Record<string, any> = { slackChannelId: channelId, conversationHistory: [] };
        if (sentinelClient) contextData.clientId = sentinelClient._id;
        channelContext = await ChannelContext.create(contextData);
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

      // Start a threshold timer — if processing takes longer than THINKING_THRESHOLD_MS,
      // post a friendly "working on it" message and later update it with the real answer.
      thinkingTimer = setTimeout(async () => {
        try {
          const msg = THINKING_MESSAGES[Math.floor(Math.random() * THINKING_MESSAGES.length)];
          const posted = await client.chat.postMessage({ channel: channelId, text: msg });
          thinkingTs = posted.ts as string;
        } catch (e) {
          logger.warn('Failed to post thinking message:', e);
        }
      }, THINKING_THRESHOLD_MS);

      const systemPrompt = sentinelClient
        ? `You are Sentinel, a marketing report assistant. You help marketers analyze Facebook Ads campaigns. You have access to tools to fetch campaign data, run analysis skills, and more. The current client is "${sentinelClient.name}". Be concise and data-driven in your responses. Format responses for Slack (use *bold*, _italic_, and bullet points).`
        : `You are Sentinel, a marketing report assistant. You help marketers analyze Facebook Ads campaigns. This channel is not linked to a specific client. You can still help with global actions like syncing clients and campaigns from Windsor. Use the sync_clients_and_campaigns tool when the user asks to import, fetch, or sync their data. Format responses for Slack (use *bold*, _italic_, and bullet points).`;

      let response = await createMessageWithRetry(anthropic, {
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: systemPrompt,
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

        response = await createMessageWithRetry(anthropic, {
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system: systemPrompt,
          tools,
          messages,
        });
      }

      // Extract final text response
      const textBlocks = response.content.filter(
        (b): b is Anthropic.TextBlock => b.type === 'text'
      );
      const replyText = textBlocks.map((b) => b.text).join('\n') || 'I processed your request but have no text response.';

      clearTimeout(thinkingTimer);
      if (thinkingTs) {
        // Replace the "thinking" message with the real answer in-place
        await client.chat.update({ channel: channelId, ts: thinkingTs, text: replyText });
      } else {
        await say(replyText);
      }

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
    } finally {
      clearTimeout(thinkingTimer);
    }
  });
}
