import { Controller, Post, Body, Sse, Get, Param, Delete } from '@nestjs/common'
import { Observable } from 'rxjs'
import { ChatService } from './chat.service.js'
import { ChatRequestDto } from './dto/chat.dto.js'
import { SessionService } from '../session/session.service.js'

@Controller('api')
export class ChatController {
  constructor(
    private chatService: ChatService,
    private sessionService: SessionService
  ) {}

  @Post('sessions')
  async createSession() {
    const session = await this.sessionService.createSession()
    return { id: session.id }
  }

  @Get('sessions')
  async getSessions() {
    const sessions = await this.sessionService.getSessions()
    return sessions.map((s) => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt,
    }))
  }

  @Get('sessions/:id/messages')
  async getMessages(@Param('id') sessionId: string) {
    const messages = await this.sessionService.getMessages(sessionId)
    return messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      sources: m.sources,
      createdAt: m.createdAt,
    }))
  }

  @Delete('sessions/:id')
  async deleteSession(@Param('id') sessionId: string) {
    await this.sessionService.deleteSession(sessionId)
    return { success: true }
  }

  @Post('chat')
  @Sse()
  chat(@Body() dto: ChatRequestDto): Observable<any> {
    return new Observable((observer) => {
      const stream = this.chatService.streamChat(dto.sessionId, dto.message)

      ;(async () => {
        try {
          for await (const chunk of stream) {
            observer.next({ data: chunk })
          }
          observer.complete()
        } catch (error) {
          observer.error(error)
        }
      })()
    })
  }
}
