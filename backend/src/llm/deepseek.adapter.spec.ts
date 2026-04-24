import { DeepseekAdapter } from './deepseek.adapter';
import { ConfigService } from '../config/config.service';

describe('DeepseekAdapter', () => {
  let adapter: DeepseekAdapter;

  beforeEach(() => {
    const configMock = {
      llm: { apiKey: 'test', baseUrl: 'http://test', model: 'test-model' },
    } as any;
    adapter = new DeepseekAdapter(configMock);
  });

  it('chat should yield content tokens from SSE stream', async () => {
    const encoder = new TextEncoder();
    const sseStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hello "}}]}\n\n'));
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"World"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: sseStream,
    } as any);

    const tokens: string[] = [];
    for await (const t of adapter.chat([{ role: 'user', content: 'How are you?' }])) {
      tokens.push(t);
    }
    expect(tokens.join('')).toContain('Hello');
    expect(tokens.join('')).toContain('World');
  });

  it('chat should throw on non-ok response', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 } as any);
    await expect(async () => {
      for await (const _ of adapter.chat([{ role: 'user', content: 'Q' }])) {
      }
    }).rejects.toBeTruthy();
  });

  it('complete should return content string', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'complete content' } }] }),
    } as any);

    const res = await adapter.complete('Question?');
    expect(res).toContain('complete content');
  });

  it('complete should throw on non-ok response', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 400 } as any);
    await expect(adapter.complete('Question?')).rejects.toBeTruthy();
  });
});
