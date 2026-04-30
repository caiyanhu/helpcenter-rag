import { Injectable } from '@nestjs/common'
import * as fs from 'fs'
import * as yaml from 'js-yaml'
import * as path from 'path'

interface AppConfig {
  embedding: {
    provider: string
    model: string
    baseUrl: string
  }
  llm: {
    provider: string
    model: string
    baseUrl: string
    apiKey: string
  }
  mmr: {
    enabled: boolean
    fetchK: number
    lambda: number
  }
  retrieval: {
    topK: number
    similarityThreshold: number
    finalK: number
  }
  reranker: {
    provider: string
    model?: string
  }
  hybrid: {
    enabled: boolean
    rrfK: number
  }
  queryRewrite: {
    enabled: boolean
    minQueryLength: number
    semanticRewrite: boolean
  }
}

@Injectable()
export class ConfigService {
  private readonly config: AppConfig

  constructor() {
    const configPath = path.resolve(process.cwd(), 'src', 'config', 'config.yaml')
    const envKey = process.env.DEEPSEEK_API_KEY || process.env.ZHIPUAI_API_KEY || ''

    let fileConfig: Partial<AppConfig> = {}
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8')
      fileConfig = yaml.load(content) as AppConfig
    }

    this.config = {
      embedding: {
        provider: process.env.EMBEDDING_PROVIDER || fileConfig.embedding?.provider || 'ollama',
        model: process.env.EMBEDDING_MODEL || fileConfig.embedding?.model || 'bge-base-zh-v1.5',
        baseUrl:
          process.env.EMBEDDING_BASE_URL ||
          fileConfig.embedding?.baseUrl ||
          'http://localhost:11434',
      },
      llm: {
        provider: process.env.LLM_PROVIDER || fileConfig.llm?.provider || 'deepseek',
        model: process.env.LLM_MODEL || fileConfig.llm?.model || 'deepseek-chat',
        baseUrl:
          process.env.LLM_BASE_URL || fileConfig.llm?.baseUrl || 'https://api.deepseek.com/v1',
        apiKey: envKey || fileConfig.llm?.apiKey || '',
      },
      mmr: {
        enabled: fileConfig.mmr?.enabled ?? true,
        fetchK: fileConfig.mmr?.fetchK ?? 20,
        lambda: fileConfig.mmr?.lambda ?? 0.5,
      },
      retrieval: {
        topK: Number(process.env.RETRIEVAL_TOP_K) || fileConfig.retrieval?.topK || 20,
        similarityThreshold:
          Number(process.env.RETRIEVAL_SIMILARITY_THRESHOLD) ||
          fileConfig.retrieval?.similarityThreshold ||
          0.7,
        finalK: Number(process.env.RETRIEVAL_FINAL_K) || fileConfig.retrieval?.finalK || 10,
      },
      reranker: {
        provider: process.env.RERANKER_PROVIDER || fileConfig.reranker?.provider || 'none',
        model: fileConfig.reranker?.model,
      },
      hybrid: {
        enabled: fileConfig.hybrid?.enabled ?? false,
        rrfK: fileConfig.hybrid?.rrfK ?? 60,
      },
      queryRewrite: {
        enabled: fileConfig.queryRewrite?.enabled ?? true,
        minQueryLength: fileConfig.queryRewrite?.minQueryLength ?? 10,
        semanticRewrite: fileConfig.queryRewrite?.semanticRewrite ?? true,
      },
    }
  }

  get embedding() {
    return this.config.embedding
  }

  get llm() {
    return this.config.llm
  }

  get mmr() {
    return this.config.mmr
  }

  get retrieval() {
    return this.config.retrieval
  }

  get reranker() {
    return this.config.reranker
  }

  get hybrid() {
    return this.config.hybrid
  }

  get queryRewrite() {
    return this.config.queryRewrite
  }
}
