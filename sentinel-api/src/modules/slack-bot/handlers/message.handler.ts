import { App } from '@slack/bolt';
import { User, Client, ChannelContext } from '../../shared/db/models';
import { getToolDefinitions, executeToolCall } from '../../mcp/server';
import { logger } from '../../shared/utils/logger';
import { createAIProvider, AIMessage, AITextPart, AIToolUsePart, AIToolResultPart, AIToolDefinition } from '../../shared/ai';

const MAX_HISTORY = 20;
const MAX_TOOL_ITERATIONS = 10;
const THINKING_THRESHOLD_MS = 5000;

const THINKING_MESSAGES = [
  '⏳ On it! This one needs a moment of thought...',
  '🔍 Digging into your data, hang tight...',
  '⚙️ Working on it! I\'ll have something for you shortly...',
  '📊 Crunching the numbers, give me a sec...',
  '🧠 Thinking this through, won\'t be long...',
];

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

      const sentinelUser = await User.findOne({ 'slackWorkspaces.teamId': teamId });
      if (!sentinelUser) {
        await say('This Slack workspace is not connected to Sentinel yet. Please complete the OAuth flow from the Sentinel dashboard.');
        return;
      }

      const sentinelClient = await Client.findOne({
        slackChannelId: channelId,
        userId: sentinelUser._id,
      });

      // Load or create channel context — scoped by both channelId and teamId
      let channelContext = await ChannelContext.findOne({ slackChannelId: channelId, teamId });
      if (!channelContext) {
        const contextData: Record<string, any> = { slackChannelId: channelId, teamId, conversationHistory: [] };
        if (sentinelClient) contextData.clientId = sentinelClient._id;
        channelContext = await ChannelContext.create(contextData);
      }

      // Add user message to history
      channelContext.conversationHistory.push({
        role: 'user',
        content: userText,
        timestamp: new Date(),
      });

      // Build messages for the AI provider
      const messages: AIMessage[] = channelContext.conversationHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      const provider = createAIProvider();
      const tools = getToolDefinitions() as AIToolDefinition[];

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

      let response = await provider.createMessage({
        system: systemPrompt,
        messages,
        tools,
        max_tokens: 2048,
      });

      // Tool call loop
      let iterations = 0;
      while (response.stop_reason === 'tool_use' && iterations < MAX_TOOL_ITERATIONS) {
        iterations++;
        const toolUseBlocks = response.content.filter(
          (b): b is AIToolUsePart => b.type === 'tool_use'
        );

        const toolResults: AIToolResultPart[] = [];
        for (const toolUse of toolUseBlocks) {
          try {
            const result = await executeToolCall(
              toolUse.name,
              toolUse.input,
              userContext
            );
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              tool_name: toolUse.name,
              content: JSON.stringify(result),
            });
          } catch (error: any) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              tool_name: toolUse.name,
              content: `Error: ${error.message}`,
              is_error: true,
            });
          }
        }

        messages.push({ role: 'assistant', content: response.content });
        messages.push({ role: 'user', content: toolResults });

        response = await provider.createMessage({
          system: systemPrompt,
          messages,
          tools,
          max_tokens: 2048,
        });
      }

      // Extract final text response
      const textBlocks = response.content.filter(
        (b): b is AITextPart => b.type === 'text'
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
