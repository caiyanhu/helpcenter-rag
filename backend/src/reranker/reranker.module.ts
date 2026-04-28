import { Module } from '@nestjs/common'
import { ConfigService } from '../config/config.service.js'
import { RERANKER_ADAPTER_TOKEN } from './reranker.interface.js'
import { NoOpReranker } from './no-op.adapter.js'
import { CrossEncoderReranker } from './cross-encoder.adapter.js'

@Module({
  providers: [
    {
      provide: RERANKER_ADAPTER_TOKEN,
      useFactory: (config: ConfigService) => {
        switch (config.reranker.provider) {
          case 'cross-encoder':
            return new CrossEncoderReranker(config)
          case 'none':
          default:
            return new NoOpReranker()
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [RERANKER_ADAPTER_TOKEN],
})
export class RerankerModule {}
