import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

interface AppConfig {
  embedding: {
    provider: string;
    model: string;
    baseUrl: string;
  };
  llm: {
    provider: string;
    model: string;
    baseUrl: string;
    apiKey: string;
  };
  reranker: {
    provider: string;
    model?: string;
  };
  queryRewrite: {
    enabled: boolean;
    minQueryLength: number;
  };
}

@Injectable()
export class ConfigService {
  private readonly config: AppConfig;

  constructor() {
    const configPath = path.resolve(process.cwd(), 'src', 'config', 'config.yaml');
    const envKey = process.env.DEEPSEEK_API_KEY || '';

    let fileConfig: Partial<AppConfig> = {};
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      fileConfig = yaml.load(content) as AppConfig;
    }

    this.config = {
      embedding: {
        provider: process.env.EMBEDDING_PROVIDER || fileConfig.embedding?.provider || 'ollama',
        model: process.env.EMBEDDING_MODEL || fileConfig.embedding?.model || 'bge-base-zh-v1.5',
        baseUrl: process.env.OLLAMA_BASE_URL || fileConfig.embedding?.baseUrl || 'http://localhost:11434',
      },
      llm: {
        provider: process.env.LLM_PROVIDER || fileConfig.llm?.provider || 'deepseek',
        model: process.env.LLM_MODEL || fileConfig.llm?.model || 'deepseek-chat',
        baseUrl: process.env.LLM_BASE_URL || fileConfig.llm?.baseUrl || 'https://api.deepseek.com/v1',
        apiKey: envKey || fileConfig.llm?.apiKey || '',
      },
      reranker: {
        provider: process.env.RERANKER_PROVIDER || fileConfig.reranker?.provider || 'none',
        model: fileConfig.reranker?.model,
      },
      queryRewrite: {
        enabled: fileConfig.queryRewrite?.enabled ?? true,
        minQueryLength: fileConfig.queryRewrite?.minQueryLength ?? 10,
      },
    };
  }

  get embedding() {
    return this.config.embedding;
  }

  get llm() {
    return this.config.llm;
  }

  get reranker() {
    return this.config.reranker;
  }

  get queryRewrite() {
    return this.config.queryRewrite;
  }
}
