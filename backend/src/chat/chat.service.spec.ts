import { Test, TestingModule } from '@nestjs/testing'
import { ChatService } from './chat.service'
import { MilvusService } from '../milvus/milvus.service'
import { LLM_ADAPTER_TOKEN } from '../llm/llm.interface'
import { QueryRewriter } from '../llm/query-rewriter'
import { RERANKER_ADAPTER_TOKEN } from '../reranker/reranker.interface'
import { SessionService } from '../session/session.service'
import { ConfigService } from '../config/config.service'

// Lightweight Open API interfaces for typing in tests (if real ones differ, rely on any)
type SearchResult = {
  id: string
  score: number
  content: string
  articleId: number
  articleTitle: string
  categoryPath: string
}

describe('ChatService.streamChat', () => {
  let service: ChatService
  // Mocks
  const milvusMock = { search: jest.fn(), searchWithMMR: jest.fn(), hybridSearch: jest.fn() } as any
  const llmMock = {
    chat: jest.fn(),
  } as any
  const queryRewriterMock = { rewrite: jest.fn() } as any
  const rerankerMock = { rerank: jest.fn() } as any
  const sessionServiceMock = {
    getMessages: jest.fn(),
    addMessage: jest.fn(),
    getSession: jest.fn(),
    updateSessionTitle: jest.fn(),
  } as any
  const configMock = {
    retrieval: { topK: 20, similarityThreshold: 0.7, finalK: 5 },
    mmr: { enabled: true, fetchK: 20, lambda: 0.5 },
    hybrid: { enabled: false, rrfK: 60 },
  } as any

  const sessionId = 'sess-1'

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: MilvusService, useValue: milvusMock },
        { provide: LLM_ADAPTER_TOKEN, useValue: llmMock },
        { provide: QueryRewriter, useValue: queryRewriterMock },
        { provide: RERANKER_ADAPTER_TOKEN, useValue: rerankerMock },
        { provide: SessionService, useValue: sessionServiceMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile()

    service = module.get<ChatService>(ChatService)
  })

  it('happy path: streams tokens and yields done with sources', async () => {
    const userMessage =
      'This is a test message to check the streaming path in chat service implementation.'

    // Prepare mocks for the happy path
    queryRewriterMock.rewrite.mockResolvedValue(['rewritten query'])
    const milvusResults: SearchResult[] = [
      {
        id: 'r1',
        score: 0.9,
        content: 'c1',
        articleId: 101,
        articleTitle: 'A1',
        categoryPath: 'cat/1',
      },
      {
        id: 'r2',
        score: 0.88,
        content: 'c2',
        articleId: 102,
        articleTitle: 'A2',
        categoryPath: 'cat/2',
      },
      {
        id: 'r3',
        score: 0.85,
        content: 'c3',
        articleId: 103,
        articleTitle: 'A3',
        categoryPath: 'cat/3',
      },
    ]
    milvusMock.searchWithMMR.mockResolvedValue(milvusResults)
    rerankerMock.rerank.mockImplementation((_q: any, items: any[]) => Promise.resolve(items))
    // Simulate history messages returned by sessionService
    sessionServiceMock.getMessages.mockResolvedValue([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' },
    ] as any)
    // LLM async generator yields two tokens, with the second containing citations to trigger parseSources
    llmMock.chat.mockImplementation(async function* (_llmMessages: any) {
      yield 'Hello'
      // include citations in the second token to exercise source parsing
      yield ' world [^1] [^2]'
    } as any)
    sessionServiceMock.getSession.mockResolvedValue({ title: '' } as any)

    const chunks = [] as any[]
    for await (const c of service.streamChat(sessionId, userMessage)) {
      chunks.push(c)
    }

    // Validate token chunks were emitted
    expect(chunks[0]).toHaveProperty('type', 'token')
    expect(chunks[0]).toHaveProperty('content', 'Hello')
    expect(chunks[1]).toHaveProperty('type', 'token')
    expect(chunks[1]).toHaveProperty('content', ' world  ')

    const doneChunk = chunks.find((c) => c.type === 'done')
    expect(doneChunk).toBeTruthy()
    expect(doneChunk.content).toBe('Hello world')
    expect(doneChunk).toHaveProperty('sources')
    expect(doneChunk.sources).toHaveLength(3)
    expect(doneChunk.sources[0]).toHaveProperty('articleId', milvusResults[0].articleId)
    expect(doneChunk.sources[1]).toHaveProperty('articleId', milvusResults[1].articleId)
    expect(milvusMock.searchWithMMR).toHaveBeenCalledWith('rewritten query', 20, 0.5)

    // Session messages should be added: user then assistant
    // First addMessage call for the user's message, second for the assistant response
    expect(sessionServiceMock.addMessage).toHaveBeenCalledTimes(2)
    expect(sessionServiceMock.addMessage).toHaveBeenCalledWith(sessionId, 'user', userMessage)
    // The exact assistant content is not strictly asserted here, but we check it's invoked with 4 args
    expect(sessionServiceMock.addMessage).toHaveBeenCalledWith(
      sessionId,
      'assistant',
      expect.any(String),
      expect.any(Array)
    )

    // Title should be updated since the initial title is undefined/empty
    const expectedTitle = userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : '')
    expect(sessionServiceMock.updateSessionTitle).toHaveBeenCalledWith(sessionId, expectedTitle)
  })

  it('error path: yields error chunk when LLM throws', async () => {
    const userMessage = 'Trigger error path'
    queryRewriterMock.rewrite.mockResolvedValue(['query'])
    milvusMock.searchWithMMR.mockResolvedValue([])
    rerankerMock.rerank.mockResolvedValue([])
    sessionServiceMock.getMessages.mockResolvedValue([] as any)
    llmMock.chat.mockImplementation(async function* (_llmMessages: any) {
      throw new Error('LLM failure')
    } as any)
    sessionServiceMock.getSession.mockResolvedValue({ title: '' } as any)

    const chunks = [] as any[]
    for await (const c of service.streamChat(sessionId, userMessage)) chunks.push(c)

    // Expect a single error chunk
    expect(chunks.find((c) => c.type === 'error')).toBeTruthy()
    const errChunk = chunks.find((c) => c.type === 'error')
    expect(errChunk).toHaveProperty('error', 'LLM failure')
  })

  it('title NOT updated when session title already exists', async () => {
    const userMessage = 'Another test message to update title'
    queryRewriterMock.rewrite.mockResolvedValue(['query'])
    milvusMock.searchWithMMR.mockResolvedValue([])
    rerankerMock.rerank.mockResolvedValue([])
    sessionServiceMock.getMessages.mockResolvedValue([] as any)
    llmMock.chat.mockImplementation(async function* (_llmMessages: any) {
      yield 'Hello'
    } as any)
    sessionServiceMock.getSession.mockResolvedValue({ title: 'Existing Title' } as any)

    const chunks = [] as any[]
    for await (const c of service.streamChat(sessionId, userMessage)) chunks.push(c)

    // Title should not be updated because a title already exists
    expect(sessionServiceMock.updateSessionTitle).not.toHaveBeenCalled()
  })

  it('uses hybridSearch when hybrid.enabled is true', async () => {
    const userMessage = 'Test hybrid search path in chat service implementation.'
    configMock.hybrid.enabled = true

    queryRewriterMock.rewrite.mockResolvedValue(['hybrid query'])
    const hybridResults: SearchResult[] = [
      {
        id: 'h1',
        score: 0.95,
        content: 'hybrid content 1',
        articleId: 201,
        articleTitle: 'H1',
        categoryPath: 'cat/h1',
      },
    ]
    milvusMock.hybridSearch.mockResolvedValue(hybridResults)
    rerankerMock.rerank.mockImplementation((_q: any, items: any[]) => Promise.resolve(items))
    sessionServiceMock.getMessages.mockResolvedValue([] as any)
    llmMock.chat.mockImplementation(async function* (_llmMessages: any) {
      yield 'Hybrid answer'
    } as any)
    sessionServiceMock.getSession.mockResolvedValue({ title: '' } as any)

    const chunks = [] as any[]
    for await (const c of service.streamChat(sessionId, userMessage)) chunks.push(c)

    expect(milvusMock.hybridSearch).toHaveBeenCalledWith('hybrid query', undefined, 60)
    expect(milvusMock.searchWithMMR).not.toHaveBeenCalled()
    const doneChunk = chunks.find((c) => c.type === 'done')
    expect(doneChunk).toBeTruthy()

    configMock.hybrid.enabled = false
  })
})
