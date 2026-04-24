import { QueryRewriter } from './query-rewriter';
import { ConfigService } from '../config/config.service';

describe('QueryRewriter', () => {
  const createConfig = (overrides?: any): ConfigService =>
    ({
      llm: { apiKey: 'test', baseUrl: 'http://test', model: 'test-model' },
      embedding: { provider: 'ollama', model: 'bge-m3', baseUrl: 'http://localhost:11434' },
      reranker: { provider: 'none' },
      queryRewrite: { enabled: true, minQueryLength: 5 },
      ...overrides,
    } as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('disabled: returns original query', async () => {
    const qr = new QueryRewriter(createConfig({ queryRewrite: { enabled: false, minQueryLength: 5 } }));
    const res = await qr.rewrite('query');
    expect(res).toBe('query');
  });

  it('short query: returns original', async () => {
    const qr = new QueryRewriter(createConfig());
    const res = await qr.rewrite('short');
    expect(res).toBe('short');
  });

  it('rewrite: uses LLM.complete and returns rewritten', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'rewritten query' } }] }),
    });
    const qr = new QueryRewriter(createConfig());
    const res = await qr.rewrite('hi');
    expect(res).toBe('rewritten query');
  });

  it('rewrite failure: returns original on error', async () => {
    (globalThis as any).fetch = jest.fn().mockRejectedValue(new Error('fail'));
    const qr = new QueryRewriter(createConfig());
    const res = await qr.rewrite('another long query');
    expect(res).toBe('another long query');
  });
});
