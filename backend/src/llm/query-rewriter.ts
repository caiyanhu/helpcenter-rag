import { Injectable } from '@nestjs/common'
import { DeepseekAdapter } from './deepseek.adapter.js'
import { ConfigService } from '../config/config.service.js'

@Injectable()
export class QueryRewriter {
  private llm: DeepseekAdapter

  constructor(private config: ConfigService) {
    this.llm = new DeepseekAdapter(config)
  }

  async rewrite(query: string): Promise<string> {
    if (!this.config.queryRewrite.enabled) {
      return query
    }

    if (query.length >= this.config.queryRewrite.minQueryLength) {
      return query
    }

    const prompt = `将以下用户问题改写为更精确、更具体的技术查询，以便在帮助中心文档中检索到相关内容。

要求：
1. 保持原问题的核心意图
2. 补充可能缺失的技术上下文
3. 使用更正式、更具体的技术术语
4. 不要添加原问题中没有的限定条件

原问题：${query}
改写后：`

    try {
      const rewritten = await this.llm.complete(prompt)
      const clean = rewritten.trim()
      console.log(`Query rewritten: "${query}" -> "${clean}"`)
      return clean || query
    } catch (error) {
      console.warn('Query rewrite failed, using original:', error)
      return query
    }
  }
}
