import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import * as path from 'path'
import { ConfigService } from '../config/config.service.js'
import { RerankerAdapter, Candidate } from './reranker.interface.js'

@Injectable()
export class CrossEncoderReranker implements RerankerAdapter, OnModuleInit {
  private readonly logger = new Logger(CrossEncoderReranker.name)
  private tokenizer: any = null
  private model: any = null
  private modelLoaded = false
  private loading = false

  constructor(private config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.loadModel()
    } catch (error) {
      this.logger.warn(
        'Cross-encoder model failed to load; will fallback to score-based sorting',
        error instanceof Error ? error.message : error
      )
    }
  }

  private async loadModel(): Promise<void> {
    const { AutoTokenizer, AutoModelForSequenceClassification, env } = await import(
      '@xenova/transformers'
    )

    const modelId = this.config.reranker.model || 'Xenova/bge-reranker-base'
    const cacheDir = path.join(process.cwd(), '.cache', 'reranker')

    env.cacheDir = cacheDir
    env.localModelPath = path.join(cacheDir, 'models')
    env.allowRemoteModels = false
    env.allowLocalModels = true

    this.logger.log(`Loading cross-encoder model from local: ${modelId}...`)
    this.logger.log(`Local model path: ${env.localModelPath}`)

    const [tokenizer, model] = await Promise.all([
      AutoTokenizer.from_pretrained(modelId),
      AutoModelForSequenceClassification.from_pretrained(modelId, { quantized: true }),
    ])

    this.tokenizer = tokenizer
    this.model = model
    this.modelLoaded = true
    this.logger.log(`Cross-encoder model loaded: ${modelId}`)
  }

  async rerank(query: string, candidates: Candidate[]): Promise<Candidate[]> {
    if (candidates.length === 0) {
      return candidates
    }

    if (!this.modelLoaded && !this.loading) {
      this.logger.debug('Model not loaded, attempting on-demand load...')
      this.loading = true
      try {
        await this.loadModel()
      } catch (error) {
        this.logger.warn('On-demand model load failed, fallback to COSINE score sorting')
        return [...candidates].sort((a, b) => b.score - a.score)
      } finally {
        this.loading = false
      }
    }

    if (!this.modelLoaded) {
      this.logger.debug('Model still not loaded, fallback to COSINE score sorting')
      return [...candidates].sort((a, b) => b.score - a.score)
    }

    try {
      const queries = Array(candidates.length).fill(query)
      const documents = candidates.map((c) => c.content)

      const inputs = this.tokenizer(queries, {
        text_pair: documents,
        padding: true,
        truncation: true,
        max_length: 512,
      })

      const output = await this.model(inputs)
      const logitsData = output.logits.data as Float32Array

      const reranked = candidates.map((candidate, i) => ({
        ...candidate,
        score: logitsData[i],
      }))

      return reranked.sort((a, b) => b.score - a.score)
    } catch (error) {
      this.logger.warn('Reranking failed, fallback to COSINE score sorting', error)
      return [...candidates].sort((a, b) => b.score - a.score)
    }
  }
}
