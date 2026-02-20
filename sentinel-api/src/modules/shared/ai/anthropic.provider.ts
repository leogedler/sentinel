import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';
import type { AIProvider, AICreateMessageParams, AIResponse, AIContentPart } from './types';

const MAX_RETRIES = 3;

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    this.client = new Anthropic();
    this.model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
  }

  async createMessage(params: AICreateMessageParams): Promise<AIResponse> {
    const { system, messages, tools, max_tokens } = params;

    const anthropicMessages = messages.map((msg) => {
      if (typeof msg.content === 'string') {
        return { role: msg.role, content: msg.content } as Anthropic.MessageParam;
      }
      // Map AIContentPart[] → Anthropic content blocks
      const blocks = msg.content.map((part): Anthropic.ContentBlockParam | Anthropic.ToolResultBlockParam => {
        if (part.type === 'text') {
          return { type: 'text', text: part.text };
        }
        if (part.type === 'tool_use') {
          return { type: 'tool_use', id: part.id, name: part.name, input: part.input };
        }
        // tool_result
        return {
          type: 'tool_result',
          tool_use_id: part.tool_use_id,
          content: part.content,
          is_error: part.is_error,
        } as Anthropic.ToolResultBlockParam;
      });
      return { role: msg.role, content: blocks } as Anthropic.MessageParam;
    });

    const anthropicTools: Anthropic.Tool[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    }));

    const response = await this.createWithRetry({
      model: this.model,
      max_tokens,
      system,
      tools: anthropicTools,
      messages: anthropicMessages,
    });

    const content: AIContentPart[] = response.content.flatMap((block): AIContentPart[] => {
      if (block.type === 'text') {
        return [{ type: 'text', text: block.text }];
      }
      if (block.type === 'tool_use') {
        return [{
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input as Record<string, any>,
        }];
      }
      // Ignore thinking/redacted_thinking blocks
      return [];
    });

    return { content, stop_reason: response.stop_reason ?? 'end_turn' };
  }

  private async createWithRetry(
    params: Parameters<Anthropic['messages']['create']>[0]
  ): Promise<Anthropic.Message> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.client.messages.create(params) as Anthropic.Message;
      } catch (error: any) {
        const isOverloaded = error?.status === 529 || error?.error?.error?.type === 'overloaded_error';
        if (isOverloaded && attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000;
          logger.warn(`Anthropic overloaded (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Unreachable');
  }
}
