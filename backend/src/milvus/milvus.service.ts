import { Injectable } from '@nestjs/common';
import { MilvusClient } from '@zilliz/milvus2-sdk-node';
import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama';
import { ConfigService } from '../config/config.service.js';

const COLLECTION_NAME = 'helpcenter_chunks';
const VECTOR_DIM = 768;

export interface SearchResult {
  id: string;
  score: number;
  content: string;
  articleId: number;
  articleTitle: string;
  categoryPath: string;
}

@Injectable()
export class MilvusService {
  private client: MilvusClient;
  private embeddings: OllamaEmbeddings;

  constructor(private config: ConfigService) {
    const address = process.env.MILVUS_ADDRESS || 'localhost:19530';
    this.client = new MilvusClient({ address });

    this.embeddings = new OllamaEmbeddings({
      model: this.config.embedding.model,
      baseUrl: this.config.embedding.baseUrl,
    });
  }

  async search(query: string, topK: number = 5): Promise<SearchResult[]> {
    const queryVector = await this.embeddings.embedQuery(query);

    const results = await this.client.search({
      collection_name: COLLECTION_NAME,
      vector: queryVector,
      topk: topK,
      metric_type: 'L2',
      output_fields: ['content', 'article_id', 'article_title', 'category_path'],
    });

    if (!results.results || results.results.length === 0) {
      return [];
    }

    return results.results.map((result: any) => ({
      id: result.id,
      score: result.score,
      content: result.content || '',
      articleId: result.article_id,
      articleTitle: result.article_title || '',
      categoryPath: result.category_path || '',
    }));
  }

  async searchWithMMR(query: string, fetchK: number = 10, lambdaMult: number = 0.5): Promise<SearchResult[]> {
    // Fetch more results initially
    const candidates = await this.search(query, fetchK);

    if (candidates.length <= 5) {
      return candidates;
    }

    // Simple MMR implementation
    const selected: SearchResult[] = [];
    const remaining = [...candidates];

    // Select first by relevance
    selected.push(remaining.shift()!);

    while (selected.length < 5 && remaining.length > 0) {
      let bestScore = -Infinity;
      let bestIndex = 0;

      for (let i = 0; i < remaining.length; i++) {
        const relevance = 1 / (1 + remaining[i].score); // Convert distance to similarity
        const maxSimWithSelected = Math.max(
          ...selected.map(s => this.contentSimilarity(remaining[i].content, s.content))
        );
        const mmrScore = lambdaMult * relevance - (1 - lambdaMult) * maxSimWithSelected;

        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIndex = i;
        }
      }

      selected.push(remaining.splice(bestIndex, 1)[0]);
    }

    return selected;
  }

  private contentSimilarity(a: string, b: string): number {
    // Simple Jaccard similarity on words
    const wordsA = new Set(a.split(/\s+/));
    const wordsB = new Set(b.split(/\s+/));
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    return intersection.size / union.size;
  }
}
