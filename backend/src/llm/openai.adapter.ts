import { Injectable } from '@nestjs/common'
import { LLMAdapter, LLMMessage } from './llm.interface.js'
import { ConfigService } from '../config/config.service.js'

@Injectable()
export class OpenAICompatibleAdapter implements LLMAdapter {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly model: string

  constructor(private config: ConfigService) {
    this.apiKey = config.llm.apiKey
    this.baseUrl = config.llm.baseUrl
    this.model = config.llm.model
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }
    return headers
  }

  async *chat(messages: LLMMessage[]): AsyncIterable<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status} ${response.statusText}`)
    }

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter((line) => line.trim() !== '')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const text = parsed.choices?.[0]?.delta?.content
            if (text) {
              yield text
            }
          } catch (e) {
            // Ignore parse errors for keep-alive lines
          }
        }
      }
    }
  }

  async complete(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content ?? ''
  }
}
