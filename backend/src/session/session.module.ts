import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SessionService } from './session.service.js'
import { Session, Message } from './session.entity.js'

@Module({
  imports: [TypeOrmModule.forFeature([Session, Message])],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
