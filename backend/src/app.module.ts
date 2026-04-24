import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from './config/config.module.js';
import { MilvusModule } from './milvus/milvus.module.js';
import { LLMModule } from './llm/llm.module.js';
import { RerankerModule } from './reranker/reranker.module.js';
import { SessionModule } from './session/session.module.js';
import { ChatModule } from './chat/chat.module.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'data/chat.db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    ConfigModule,
    MilvusModule,
    LLMModule,
    RerankerModule,
    SessionModule,
    ChatModule,
  ],
})
export class AppModule {}
