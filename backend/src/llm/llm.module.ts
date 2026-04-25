import { Module } from '@nestjs/common'
import { DeepseekAdapter } from './deepseek.adapter.js'
import { QueryRewriter } from './query-rewriter.js'

@Module({
  providers: [DeepseekAdapter, QueryRewriter],
  exports: [DeepseekAdapter, QueryRewriter],
})
export class LLMModule {}
