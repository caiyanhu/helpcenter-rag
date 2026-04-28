import { Inject, Injectable } from '@nestjs/common'
import { MilvusService, SearchResult } from '../milvus/milvus.service.js'
import { LLM_ADAPTER_TOKEN, LLMMessage } from '../llm/llm.interface.js'
import { LLMAdapter } from '../llm/llm.interface.js'
import { QueryRewriter } from '../llm/query-rewriter.js'
import { RERANKER_ADAPTER_TOKEN, RerankerAdapter } from '../reranker/reranker.interface.js'
import { SessionService } from '../session/session.service.js'
import { ConfigService } from '../config/config.service.js'

@Injectable()
export class ChatService {
  constructor(
    private milvus: MilvusService,
    @Inject(LLM_ADAPTER_TOKEN) private llm: LLMAdapter,
    private queryRewriter: QueryRewriter,
    @Inject(RERANKER_ADAPTER_TOKEN) private reranker: RerankerAdapter,
    private sessionService: SessionService,
    private config: ConfigService
  ) {}

  async *streamChat(sessionId: string, userMessage: string): AsyncIterable<unknown> {
    try {
      const queries = await this.queryRewriter.rewrite(userMessage)
      console.log(`[RAG] Query variations: ${queries.length}`, queries)

      const allResults: SearchResult[] = []
      for (const query of queries) {
        const results = await this.milvus.search(query)
        console.log(`[RAG] Query "${query}" retrieved ${results.length} results`)
        results.forEach(r => console.log(`  - ${r.articleTitle} (score: ${r.score.toFixed(4)})`))
        allResults.push(...results)
      }

      const seenArticles = new Set<number>()
      const uniqueResults = allResults
        .sort((a, b) => b.score - a.score)
        .filter(r => {
          if (seenArticles.has(r.articleId)) return false
          seenArticles.add(r.articleId)
          return true
        })

      console.log(`[RAG] Unique results after dedup: ${uniqueResults.length}`)

      const candidates = uniqueResults.map(r => ({
        id: r.id,
        content: r.content,
        score: r.score,
        articleId: r.articleId,
        articleTitle: r.articleTitle,
        categoryPath: r.categoryPath,
      }))

      const rerankQuery = queries[0]
      const reranked = await this.reranker.rerank(rerankQuery, candidates)
      const finalK = this.config.retrieval.finalK
      const topResults = reranked.slice(0, finalK)

      console.log(`[RAG] Reranked top ${topResults.length} results:`)
      topResults.forEach((r, i) => {
        console.log(`[RAG] [${i + 1}] ${r.articleTitle} (ID: ${r.articleId}, score: ${r.score.toFixed(4)})`)
      })

      const context = topResults
        .map((r) => {
          return `【${r.categoryPath} > ${r.articleTitle}】\n${r.content}`
        })
        .join('\n\n---\n\n')

      console.log(`[RAG] Context length: ${context.length} chars`)
      console.log(`[RAG] Context preview:\n${context.substring(0, 500)}...`)

      const messages = await this.sessionService.getMessages(sessionId)
      const historyMessages: LLMMessage[] = messages.slice(-6).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      const aliasNote = queries[0] !== userMessage
        ? `\n注意：用户查询中的产品名称可能使用了简称或别名，检索时已将"${userMessage}"中的产品别名映射为标准名称"${queries[0]}"进行检索。参考资料中的"云原生数据库 PostgreSQL 版"即用户所询问的产品。\n`
        : ''

      const systemPrompt = `你是一个帮助中心客服助手。请根据以下参考资料回答用户问题。

重要规则：
1. 如果参考资料足以回答，请基于资料内容直接回答
2. 如果参考资料不足以回答，请明确告知用户"根据现有资料，暂时无法回答该问题"
3. **禁止在回答中使用任何形式的引用标记**，包括 [^1]、[1]、参考资料[x] 等
4. 只输出纯文本回答，不要包含引用来源信息
${aliasNote}
## 参考资料
${context}`

      const llmMessages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: userMessage },
      ]

      await this.sessionService.addMessage(sessionId, 'user', userMessage)

      let fullResponse = ''
      const citationPatterns = [
        /\[\^\d+\]/g,
        /\[\d+\]/g,
        /参考资料\[\d+\]/g,
        /\(\s*见?[^)]*\d+[^)]*\)/g,
      ]

      for await (const token of this.llm.chat(llmMessages)) {
        fullResponse += token
        const cleanToken = citationPatterns.reduce(
          (text, pattern) => text.replace(pattern, ''),
          token
        )
        yield { type: 'token', content: cleanToken }
      }

      const cleanResponse = citationPatterns.reduce(
        (text, pattern) => text.replace(pattern, '').trim(),
        fullResponse
      )

      const sources = topResults.map((r) => ({
        articleId: r.articleId,
        title: r.articleTitle,
        categoryPath: r.categoryPath,
        excerpt: r.content.slice(0, 200) + '...',
      }))

      await this.sessionService.addMessage(sessionId, 'assistant', cleanResponse, sources)

      const session = await this.sessionService.getSession(sessionId)
      if (session && !session.title) {
        const title = userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : '')
        await this.sessionService.updateSessionTitle(sessionId, title)
      }

      yield {
        type: 'done',
        content: cleanResponse,
        sources,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      yield { type: 'error', error: message }
    }
  }

}
