import { Injectable } from '@nestjs/common'
import { RerankerAdapter, Candidate } from './reranker.interface.js'

@Injectable()
export class NoOpReranker implements RerankerAdapter {
  async rerank(_query: string, candidates: Candidate[]): Promise<Candidate[]> {
    return candidates
  }
}
