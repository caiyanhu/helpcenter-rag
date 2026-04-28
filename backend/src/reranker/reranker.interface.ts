export const RERANKER_ADAPTER_TOKEN = Symbol('RERANKER_ADAPTER_TOKEN')

export interface Candidate {
  id: string
  content: string
  score: number
  articleId: number
  articleTitle: string
  categoryPath: string
}

export interface RerankerAdapter {
  rerank(query: string, candidates: Candidate[]): Promise<Candidate[]>
}
