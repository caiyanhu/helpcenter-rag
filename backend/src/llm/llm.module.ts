import { Module } from '@nestjs/common'
import { OpenAICompatibleAdapter } from './openai.adapter.js'
import { QueryRewriter } from './query-rewriter.js'
import { LLM_ADAPTER_TOKEN } from './llm.interface.js'

@Module({
  providers: [
    { provide: LLM_ADAPTER_TOKEN, useClass: OpenAICompatibleAdapter },
    QueryRewriter,
  ],
  exports: [LLM_ADAPTER_TOKEN, QueryRewriter],
})
export class LLMModule {}
