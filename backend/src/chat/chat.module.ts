import { Module } from '@nestjs/common'
import { ChatController } from './chat.controller.js'
import { ChatService } from './chat.service.js'
import { MilvusModule } from '../milvus/milvus.module.js'
import { LLMModule } from '../llm/llm.module.js'
import { RerankerModule } from '../reranker/reranker.module.js'
import { SessionModule } from '../session/session.module.js'

@Module({
  imports: [MilvusModule, LLMModule, RerankerModule, SessionModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
