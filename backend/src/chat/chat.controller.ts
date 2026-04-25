import { Controller, Post, Body, Sse, Get, Param, Delete } from '@nestjs/common'
import { Observable } from 'rxjs'
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { ChatService } from './chat.service.js'
import { ChatRequestDto } from './dto/chat.dto.js'
import { SessionService } from '../session/session.service.js'

@ApiTags('chat')
@Controller('api')
export class ChatController {
  constructor(
    private chatService: ChatService,
    private sessionService: SessionService
  ) {}

  @Post('sessions')
  @ApiOperation({ summary: '创建新会话' })
  @ApiResponse({ status: 201, description: '会话创建成功' })
  async createSession() {
    const session = await this.sessionService.createSession()
    return { id: session.id }
  }

  @Get('sessions')
  @ApiOperation({ summary: '获取所有会话' })
  @ApiResponse({ status: 200, description: '返回会话列表' })
  async getSessions() {
    const sessions = await this.sessionService.getSessions()
    return sessions.map((s) => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt,
    }))
  }

  @Get('sessions/:id/messages')
  @ApiOperation({ summary: '获取会话消息' })
  @ApiParam({ name: 'id', description: '会话 ID' })
  @ApiResponse({ status: 200, description: '返回消息列表' })
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
  @ApiOperation({ summary: '删除会话' })
  @ApiParam({ name: 'id', description: '会话 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteSession(@Param('id') sessionId: string) {
    await this.sessionService.deleteSession(sessionId)
    return { success: true }
  }

  @Post('chat')
  @Sse()
  @ApiOperation({ summary: '发送消息并获取流式回复' })
  @ApiResponse({
    status: 200,
    description: 'SSE 流式返回',
  })
  chat(@Body() dto: ChatRequestDto): Observable<unknown> {
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
