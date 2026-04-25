import { Module } from '@nestjs/common'
import { NoOpReranker } from './no-op.adapter.js'

@Module({
  providers: [NoOpReranker],
  exports: [NoOpReranker],
})
export class RerankerModule {}
