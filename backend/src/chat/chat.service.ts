import { Injectable } from '@nestjs/common';
import { MilvusService, SearchResult } from '../milvus/milvus.service.js';
import { DeepseekAdapter } from '../llm/deepseek.adapter.js';
import { QueryRewriter } from '../llm/query-rewriter.js';
import { NoOpReranker } from '../reranker/no-op.adapter.js';
import { SessionService } from '../session/session.service.js';
import { LLMMessage } from '../llm/llm.interface.js';

@Injectable()
export class ChatService {
  constructor(
    private milvus: MilvusService,
    private llm: DeepseekAdapter,
    private queryRewriter: QueryRewriter,
    private reranker: NoOpReranker,
    private sessionService: SessionService,
  ) {}

  async *streamChat(sessionId: string, userMessage: string): AsyncIterable<any> {
    try {
      // 1. Rewrite query if needed
      const query = await this.queryRewriter.rewrite(userMessage);

      // 2. Retrieve relevant chunks
      const results = await this.milvus.searchWithMMR(query, 10, 0.5);

      // 3. Rerank (no-op for now)
      const rankedResults = await this.reranker.rerank(query, results.map(r => ({
        id: r.id,
        content: r.content,
        score: r.score,
        articleId: r.articleId,
        articleTitle: r.articleTitle,
        categoryPath: r.categoryPath,
      })));

      // 4. Build prompt with context
      const context = rankedResults.slice(0, 5).map((r, i) => {
        return `[${i + 1}] ${r.categoryPath} > ${r.articleTitle}\n${r.content}`;
      }).join('\n\n');

      // 5. Get conversation history
      const messages = await this.sessionService.getMessages(sessionId);
      const historyMessages: LLMMessage[] = messages.slice(-6).map(m => ({
        role: m.role as any,
        content: m.content,
      }));

      const systemPrompt = `你是一个帮助中心客服助手。请根据以下参考资料回答用户问题。
如果参考资料不足以回答，请明确告知用户。
请在回答中标注引用来源，格式为 [^1]、[^2] 等。

## 参考资料
${context}`;

      const llmMessages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: userMessage },
      ];

      // 6. Save user message
      await this.sessionService.addMessage(sessionId, 'user', userMessage);

      // 7. Stream LLM response
      let fullResponse = '';

      for await (const token of this.llm.chat(llmMessages)) {
        fullResponse += token;
        yield { type: 'token', content: token };
      }

      // 8. Parse sources from response
      const sources = this.parseSources(fullResponse, rankedResults.slice(0, 5));

      // 9. Save assistant message
      await this.sessionService.addMessage(sessionId, 'assistant', fullResponse, sources);

      // 10. Update session title if first message
      const session = await this.sessionService.getSession(sessionId);
      if (session && !session.title) {
        const title = userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : '');
        await this.sessionService.updateSessionTitle(sessionId, title);
      }

      yield {
        type: 'done',
        content: fullResponse,
        sources: sources.map(s => ({
          articleId: s.articleId,
          title: s.title,
          categoryPath: s.categoryPath,
          excerpt: s.excerpt,
        })),
      };
    } catch (error: any) {
      yield { type: 'error', error: error.message || 'Unknown error' };
    }
  }

  private parseSources(response: string, results: SearchResult[]) {
    const sources = [];
    const citationRegex = /\[\^(\d+)\]/g;
    const matches = [...response.matchAll(citationRegex)];
    const usedIndices = new Set(matches.map(m => parseInt(m[1])));

    for (const index of usedIndices) {
      const result = results[index - 1];
      if (result) {
        sources.push({
          articleId: result.articleId,
          title: result.articleTitle,
          categoryPath: result.categoryPath,
          excerpt: result.content.slice(0, 200) + '...',
        });
      }
    }

    return sources;
  }
}
