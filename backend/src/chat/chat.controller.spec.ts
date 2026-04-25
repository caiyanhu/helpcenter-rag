import { Test, TestingModule } from '@nestjs/testing'
import { Observable } from 'rxjs'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'
import { SessionService } from '../session/session.service'

describe('ChatController', () => {
  let controller: ChatController
  let chatService: jest.Mocked<ChatService>
  let sessionService: jest.Mocked<SessionService>

  const mockChatService = {
    streamChat: jest.fn(),
  }

  const mockSessionService = {
    createSession: jest.fn(),
    getSessions: jest.fn(),
    getMessages: jest.fn(),
    deleteSession: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        { provide: ChatService, useValue: mockChatService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile()

    controller = module.get<ChatController>(ChatController)
    chatService = module.get(ChatService)
    sessionService = module.get(SessionService)

    jest.clearAllMocks()
  })

  describe('POST /api/sessions', () => {
    it('should return { id } with session id', async () => {
      const mockSession = { id: 'session-123', title: null, createdAt: new Date(), messages: [] }
      mockSessionService.createSession.mockResolvedValue(mockSession as any)

      const result = await controller.createSession()

      expect(mockSessionService.createSession).toHaveBeenCalled()
      expect(result).toEqual({ id: 'session-123' })
    })
  })

  describe('GET /api/sessions', () => {
    it('should return mapped sessions', async () => {
      const mockSessions = [
        { id: 's1', title: 'Session 1', createdAt: new Date('2024-01-01') },
        { id: 's2', title: 'Session 2', createdAt: new Date('2024-01-02') },
      ]
      mockSessionService.getSessions.mockResolvedValue(mockSessions as any)

      const result = await controller.getSessions()

      expect(mockSessionService.getSessions).toHaveBeenCalled()
      expect(result).toEqual([
        { id: 's1', title: 'Session 1', createdAt: mockSessions[0].createdAt },
        { id: 's2', title: 'Session 2', createdAt: mockSessions[1].createdAt },
      ])
    })
  })

  describe('GET /api/sessions/:id/messages', () => {
    it('should return mapped messages', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          sources: null,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi there',
          sources: [{ articleId: 1, title: 'Test', categoryPath: '/test', excerpt: 'Test' }],
          createdAt: new Date('2024-01-02'),
        },
      ]
      mockSessionService.getMessages.mockResolvedValue(mockMessages as any)

      const result = await controller.getMessages('session-1')

      expect(mockSessionService.getMessages).toHaveBeenCalledWith('session-1')
      expect(result).toEqual([
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          sources: null,
          createdAt: mockMessages[0].createdAt,
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi there',
          sources: mockMessages[1].sources,
          createdAt: mockMessages[1].createdAt,
        },
      ])
    })
  })

  describe('DELETE /api/sessions/:id', () => {
    it('should return { success: true }', async () => {
      mockSessionService.deleteSession.mockResolvedValue(undefined)

      const result = await controller.deleteSession('session-1')

      expect(mockSessionService.deleteSession).toHaveBeenCalledWith('session-1')
      expect(result).toEqual({ success: true })
    })
  })

  describe('POST /api/chat', () => {
    it('should return Observable that emits SSE chunks', (done) => {
      const chunks = [
        { type: 'token', content: 'Hello' },
        { type: 'token', content: ' world' },
        { type: 'done', content: 'Hello world', sources: [] },
      ]
      const mockIterator = {
        next: jest
          .fn()
          .mockResolvedValueOnce({ value: chunks[0], done: false })
          .mockResolvedValueOnce({ value: chunks[1], done: false })
          .mockResolvedValueOnce({ value: chunks[2], done: false })
          .mockResolvedValue({ done: true }),
      }
      const mockStream = {
        [Symbol.asyncIterator]: () => mockIterator,
      }
      mockChatService.streamChat.mockReturnValue(mockStream as any)

      const dto = { sessionId: 'session-1', message: 'Hello' }
      const observable = controller.chat(dto)

      const emitted: any[] = []
      observable.subscribe({
        next: (value) => emitted.push(value),
        complete: () => {
          expect(mockChatService.streamChat).toHaveBeenCalledWith('session-1', 'Hello')
          expect(emitted).toEqual([
            { data: { type: 'token', content: 'Hello' } },
            { data: { type: 'token', content: ' world' } },
            { data: { type: 'done', content: 'Hello world', sources: [] } },
          ])
          done()
        },
        error: (err) => {
          console.error('Stream error:', err)
          done(err)
        },
      })
    })
  })
})
