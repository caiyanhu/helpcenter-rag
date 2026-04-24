export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMAdapter {
  chat(messages: LLMMessage[]): AsyncIterable<string>;
  complete(prompt: string): Promise<string>;
}
