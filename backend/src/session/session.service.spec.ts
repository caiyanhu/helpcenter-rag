import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SessionService } from './session.service'
import { Session, Message, Source } from './session.entity'

describe('SessionService', () => {
  let service: SessionService
  let sessionRepo: jest.Mocked<Repository<Session>>
  let messageRepo: jest.Mocked<Repository<Message>>

  const mockSessionRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  }

  const mockMessageRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: getRepositoryToken(Session),
          useValue: mockSessionRepo,
        },
        {
          provide: getRepositoryToken(Message),
          useValue: mockMessageRepo,
        },
      ],
    }).compile()

    service = module.get<SessionService>(SessionService)
    sessionRepo = module.get(getRepositoryToken(Session))
    messageRepo = module.get(getRepositoryToken(Message))

    jest.clearAllMocks()
  })

  describe('createSession', () => {
    it('should create and save a session', async () => {
      const mockSession = { id: 'session-1', title: null, createdAt: new Date(), messages: [] }
      mockSessionRepo.create.mockReturnValue(mockSession as any)
      mockSessionRepo.save.mockResolvedValue(mockSession as any)

      const result = await service.createSession()

      expect(mockSessionRepo.create).toHaveBeenCalledWith({})
      expect(mockSessionRepo.save).toHaveBeenCalledWith(mockSession)
      expect(result).toEqual(mockSession)
    })
  })

  describe('getSessions', () => {
    it('should return sessions ordered by createdAt DESC', async () => {
      const mockSessions = [
        { id: 's1', title: 'Session 1', createdAt: new Date() },
        { id: 's2', title: 'Session 2', createdAt: new Date() },
      ]
      mockSessionRepo.find.mockResolvedValue(mockSessions as any)

      const result = await service.getSessions()

      expect(mockSessionRepo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } })
      expect(result).toEqual(mockSessions)
    })
  })

  describe('getSession', () => {
    it('should find one session with relations', async () => {
      const mockSession = { id: 'session-1', title: 'Test', messages: [] }
      mockSessionRepo.findOne.mockResolvedValue(mockSession as any)

      const result = await service.getSession('session-1')

      expect(mockSessionRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        relations: ['messages'],
      })
      expect(result).toEqual(mockSession)
    })

    it('should return null if session not found', async () => {
      mockSessionRepo.findOne.mockResolvedValue(null)

      const result = await service.getSession('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('deleteSession', () => {
    it('should delete messages then session', async () => {
      mockMessageRepo.delete.mockResolvedValue({ affected: 1 } as any)
      mockSessionRepo.delete.mockResolvedValue({ affected: 1 } as any)

      await service.deleteSession('session-1')

      expect(mockMessageRepo.delete).toHaveBeenCalledWith({ sessionId: 'session-1' })
      expect(mockSessionRepo.delete).toHaveBeenCalledWith('session-1')
    })
  })

  describe('addMessage', () => {
    it('should create and save message without sources', async () => {
      const mockMessage = {
        id: 'msg-1',
        sessionId: 'session-1',
        role: 'user',
        content: 'Hello',
        sources: null,
        createdAt: new Date(),
      }
      mockMessageRepo.create.mockReturnValue(mockMessage as any)
      mockMessageRepo.save.mockResolvedValue(mockMessage as any)

      const result = await service.addMessage('session-1', 'user', 'Hello')

      expect(mockMessageRepo.create).toHaveBeenCalledWith({
        sessionId: 'session-1',
        role: 'user',
        content: 'Hello',
        sources: null,
      })
      expect(mockMessageRepo.save).toHaveBeenCalledWith(mockMessage)
      expect(result).toEqual(mockMessage)
    })

    it('should create and save message with sources', async () => {
      const sources: Source[] = [
        { articleId: 1, title: 'Test', categoryPath: '/test', excerpt: 'Test excerpt' },
      ]
      const mockMessage = {
        id: 'msg-1',
        sessionId: 'session-1',
        role: 'assistant',
        content: 'Hi there',
        sources,
        createdAt: new Date(),
      }
      mockMessageRepo.create.mockReturnValue(mockMessage as any)
      mockMessageRepo.save.mockResolvedValue(mockMessage as any)

      const result = await service.addMessage('session-1', 'assistant', 'Hi there', sources)

      expect(mockMessageRepo.create).toHaveBeenCalledWith({
        sessionId: 'session-1',
        role: 'assistant',
        content: 'Hi there',
        sources,
      })
      expect(result.sources).toEqual(sources)
    })

    it('should handle null sources', async () => {
      const mockMessage = {
        id: 'msg-1',
        sessionId: 'session-1',
        role: 'user',
        content: 'Hello',
        sources: null,
        createdAt: new Date(),
      }
      mockMessageRepo.create.mockReturnValue(mockMessage as any)
      mockMessageRepo.save.mockResolvedValue(mockMessage as any)

      const result = await service.addMessage('session-1', 'user', 'Hello', null)

      expect(mockMessageRepo.create).toHaveBeenCalledWith({
        sessionId: 'session-1',
        role: 'user',
        content: 'Hello',
        sources: null,
      })
      expect(result.sources).toBeNull()
    })
  })

  describe('getMessages', () => {
    it('should return messages ordered by createdAt ASC', async () => {
      const mockMessages = [
        { id: 'msg-1', role: 'user', content: 'Hello', createdAt: new Date() },
        { id: 'msg-2', role: 'assistant', content: 'Hi', createdAt: new Date() },
      ]
      mockMessageRepo.find.mockResolvedValue(mockMessages as any)

      const result = await service.getMessages('session-1')

      expect(mockMessageRepo.find).toHaveBeenCalledWith({
        where: { sessionId: 'session-1' },
        order: { createdAt: 'ASC' },
      })
      expect(result).toEqual(mockMessages)
    })
  })

  describe('updateSessionTitle', () => {
    it('should update session title', async () => {
      mockSessionRepo.update.mockResolvedValue({ affected: 1 } as any)

      await service.updateSessionTitle('session-1', 'New Title')

      expect(mockSessionRepo.update).toHaveBeenCalledWith('session-1', { title: 'New Title' })
    })
  })
})
