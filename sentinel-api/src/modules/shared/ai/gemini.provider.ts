import { GoogleGenerativeAI, type Content, type Part, type FunctionDeclaration, type Tool } from '@google/generative-ai';
import { logger } from '../utils/logger';
import type { AIProvider, AICreateMessageParams, AIResponse, AIContentPart } from './types';

const MAX_RETRIES = 3;

function uppercaseSchemaTypes(schema: any): any {
  if (schema === null || typeof schema !== 'object') return schema;

  if (Array.isArray(schema)) return schema.map(uppercaseSchemaTypes);

  const result: any = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'type' && typeof value === 'string') {
      result[key] = value.toUpperCase();
    } else if (typeof value === 'object' && value !== null) {
      result[key] = uppercaseSchemaTypes(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is required when AI_PROVIDER=gemini');
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  }

  async createMessage(params: AICreateMessageParams): Promise<AIResponse> {
    const { system, messages, tools, max_tokens } = params;

    const functionDeclarations: FunctionDeclaration[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: uppercaseSchemaTypes(t.input_schema),
    }));

    const geminiTools: Tool[] = functionDeclarations.length > 0
      ? [{ functionDeclarations }]
      : [];

    const generativeModel = this.genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: system || undefined,
      generationConfig: { maxOutputTokens: max_tokens },
    });

    const contents: Content[] = messages.map((msg) => {
      const role = msg.role === 'assistant' ? 'model' : 'user';

      if (typeof msg.content === 'string') {
        return { role, parts: [{ text: msg.content }] };
      }

      const parts: Part[] = msg.content.map((part) => {
        if (part.type === 'text') return { text: part.text };
        if (part.type === 'tool_use') {
          return { functionCall: { name: part.name, args: part.input } };
        }
        // tool_result — matched by function name
        return {
          functionResponse: {
            name: part.tool_name,
            response: { content: part.content, is_error: part.is_error ?? false },
          },
        };
      });

      return { role, parts };
    });

    const geminiResponse = await this.generateWithRetry(generativeModel, contents, geminiTools);

    const candidates = geminiResponse.response.candidates ?? [];
    const responseParts: Part[] = candidates[0]?.content?.parts ?? [];
    const finishReason = candidates[0]?.finishReason;

    const content: AIContentPart[] = [];
    let hasFunctionCall = false;

    responseParts.forEach((part, index) => {
      if (part.text) {
        content.push({ type: 'text', text: part.text });
      } else if (part.functionCall) {
        hasFunctionCall = true;
        content.push({
          type: 'tool_use',
          id: `${part.functionCall.name}_${index}`,
          name: part.functionCall.name,
          input: (part.functionCall.args as Record<string, any>) ?? {},
        });
      }
    });

    let stop_reason: string;
    if (hasFunctionCall) {
      stop_reason = 'tool_use';
    } else if (finishReason === 'MAX_TOKENS') {
      stop_reason = 'max_tokens';
    } else if (finishReason === 'SAFETY') {
      const safetyMessage = 'Response blocked by Gemini safety filters.';
      logger.warn('Gemini safety filter triggered');
      content.push({ type: 'text', text: safetyMessage });
      stop_reason = 'end_turn';
    } else {
      stop_reason = 'end_turn';
    }

    return { content, stop_reason };
  }

  private async generateWithRetry(
    model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
    contents: Content[],
    tools: Tool[]
  ): Promise<ReturnType<typeof model.generateContent>> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await model.generateContent({ contents, tools });
      } catch (error: any) {
        const isRateLimit = error?.status === 429 || error?.message?.includes('429');
        if (isRateLimit && attempt < MAX_RETRIES) {
          const apiDelayMs = this.parseRetryDelayMs(error);

          // If the API tells us to wait more than 2 minutes it is a daily quota
          // exhaustion — no point retrying within this request lifecycle.
          if (apiDelayMs !== null && apiDelayMs > 120_000) {
            logger.warn('Gemini daily quota exhausted, not retrying');
            throw error;
          }

          // Prefer the API-provided delay; fall back to exponential backoff.
          const delay = apiDelayMs ?? Math.pow(2, attempt) * 1000;
          logger.warn('Gemini rate limited, retrying', { attempt, maxRetries: MAX_RETRIES, delayMs: delay });
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Unreachable');
  }

  /**
   * Extracts the retry delay in milliseconds from a Gemini 429 error body.
   * The Google API embeds a RetryInfo object in the error message JSON:
   *   {"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"42s"}
   */
  private parseRetryDelayMs(error: any): number | null {
    try {
      const match = (error?.message ?? '').match(/"retryDelay":"(\d+(?:\.\d+)?)s"/);
      if (match) return Math.ceil(parseFloat(match[1])) * 1000;
    } catch {}
    return null;
  }
}
