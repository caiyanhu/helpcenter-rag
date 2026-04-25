export const LLM_ADAPTER_TOKEN = Symbol('LLM_ADAPTER_TOKEN')

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMAdapter {
  chat(messages: LLMMessage[]): AsyncIterable<string>
  complete(prompt: string): Promise<string>
}
