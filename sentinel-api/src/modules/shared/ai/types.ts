export interface AIToolDefinition {
  name: string;
  description: string;
  input_schema: { type: 'object'; properties: Record<string, any>; required?: string[] };
}

export interface AITextPart { type: 'text'; text: string }
export interface AIToolUsePart { type: 'tool_use'; id: string; name: string; input: Record<string, any> }
export interface AIToolResultPart { type: 'tool_result'; tool_use_id: string; tool_name: string; content: string; is_error?: boolean }
export type AIContentPart = AITextPart | AIToolUsePart | AIToolResultPart;

export interface AIMessage { role: 'user' | 'assistant'; content: string | AIContentPart[] }
export interface AIResponse { content: AIContentPart[]; stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | string }

export interface AICreateMessageParams {
  system: string;
  messages: AIMessage[];
  tools: AIToolDefinition[];
  max_tokens: number;
}

export interface AIProvider {
  createMessage(params: AICreateMessageParams): Promise<AIResponse>;
}
