import { AnthropicProvider } from './anthropic.provider';
import { GeminiProvider } from './gemini.provider';
import type { AIProvider } from './types';

export function createAIProvider(override?: string): AIProvider {
  const providerName = (override ?? process.env.AI_PROVIDER ?? 'anthropic').toLowerCase();
  switch (providerName) {
    case 'gemini':
      return new GeminiProvider();
    case 'anthropic':
    default:
      return new AnthropicProvider();
  }
}

export * from './types';
