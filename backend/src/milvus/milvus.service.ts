import { Injectable } from '@nestjs/common'
import { MilvusClient } from '@zilliz/milvus2-sdk-node'
import { ConfigService } from '../config/config.service.js'

const COLLECTION_NAME = 'helpcenter_chunks'

export interface SearchResult {
  id: string
  score: number
  content: string
  articleId: number
  articleTitle: string
  categoryPath: string
}

async function embedBatch(texts: string[], model: string, baseUrl: string): Promise<number[][]> {
  const response = await fetch(`${baseUrl}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: texts }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Ollama embed failed: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return data.embeddings
}

@Injectable()
export class MilvusService {
  private client: MilvusClient
  private model: string
  private baseUrl: string

  constructor(private config: ConfigService) {
    const address = process.env.MILVUS_ADDRESS || 'localhost:19530'
    this.client = new MilvusClient({ address })
    this.model = this.config.embedding.model
    this.baseUrl = this.config.embedding.baseUrl
  }

  async search(query: string, topK: number = 5): Promise<SearchResult[]> {
    const vectors = await embedBatch([query], this.model, this.baseUrl)
    const queryVector = vectors[0]

    const results = await this.client.search({
      collection_name: COLLECTION_NAME,
      vector: queryVector,
      topk: topK,
      metric_type: 'L2',
      output_fields: ['content', 'article_id', 'article_title', 'category_path'],
    })

    if (!results.results || results.results.length === 0) {
      return []
    }

    return results.results.map((result) => ({
      id: (result as { id: string }).id,
      score: (result as { score: number }).score,
      content: (result as { content?: string }).content || '',
      articleId: (result as { article_id?: number }).article_id,
      articleTitle: (result as { article_title?: string }).article_title || '',
      categoryPath: (result as { category_path?: string }).category_path || '',
    }))
  }

  async searchWithMMR(
    query: string,
    fetchK: number = 10,
    lambdaMult: number = 0.5
  ): Promise<SearchResult[]> {
    const candidates = await this.search(query, fetchK)

    if (candidates.length <= 5) {
      return candidates
    }

    const selected: SearchResult[] = []
    const remaining = [...candidates]

    selected.push(remaining.shift()!)

    while (selected.length < 5 && remaining.length > 0) {
      let bestScore = -Infinity
      let bestIndex = 0

      for (let i = 0; i < remaining.length; i++) {
        const relevance = 1 / (1 + remaining[i].score)
        const maxSimWithSelected = Math.max(
          ...selected.map((s) => this.contentSimilarity(remaining[i].content, s.content))
        )
        const mmrScore = lambdaMult * relevance - (1 - lambdaMult) * maxSimWithSelected

        if (mmrScore > bestScore) {
          bestScore = mmrScore
          bestIndex = i
        }
      }

      selected.push(remaining.splice(bestIndex, 1)[0])
    }

    return selected
  }

  private contentSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.split(/\s+/))
    const wordsB = new Set(b.split(/\s+/))
    const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)))
    const union = new Set([...wordsA, ...wordsB])
    return intersection.size / union.size
  }
}
