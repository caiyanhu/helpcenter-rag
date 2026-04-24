import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChatStore } from '@/stores/chat'
import { createSSEResponse } from '../helpers/sse'

describe('chat store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('initial state', () => {
    const store = useChatStore()
    expect(store.sessions).toEqual([])
    expect(store.messages).toEqual([])
    expect(store.currentSessionId).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('currentSession getter returns matching session', () => {
    const store = useChatStore()
    store.sessions = [{ id: 's1', title: 'Test', createdAt: '2024-01-01' }]
    store.currentSessionId = 's1'
    expect(store.currentSession).toEqual(store.sessions[0])
  })

  it('currentSession getter returns undefined when no match', () => {
    const store = useChatStore()
    store.sessions = [{ id: 's1', title: 'Test', createdAt: '2024-01-01' }]
    store.currentSessionId = 's2'
    expect(store.currentSession).toBeUndefined()
  })

  it('currentSession getter returns undefined when null', () => {
    const store = useChatStore()
    store.sessions = [{ id: 's1', title: 'Test', createdAt: '2024-01-01' }]
    store.currentSessionId = null
    expect(store.currentSession).toBeUndefined()
  })

  describe('loadSessions', () => {
    it('success: populates sessions', async () => {
      const store = useChatStore()
      const data = [{ id: 's1', title: 'Test', createdAt: '2024-01-01' }]
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(data)))
      await store.loadSessions()
      expect(store.sessions).toEqual(data)
    })

    it('failure: keeps empty sessions', async () => {
      const store = useChatStore()
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('fail'))
      await store.loadSessions()
      expect(store.sessions).toEqual([])
    })
  })

  describe('createSession', () => {
    it('success: adds session, sets current, clears messages', async () => {
      const store = useChatStore()
      store.messages = [{ id: 'm1', role: 'user', content: 'hi' }]
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 's1' })))
      const id = await store.createSession()
      expect(id).toBe('s1')
      expect(store.sessions.length).toBe(1)
      expect(store.currentSessionId).toBe('s1')
      expect(store.messages).toEqual([])
    })

    it('failure: returns null', async () => {
      const store = useChatStore()
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('fail'))
      const id = await store.createSession()
      expect(id).toBeNull()
    })
  })

  describe('loadMessages', () => {
    it('success: populates messages', async () => {
      const store = useChatStore()
      const data = [{ id: 'm1', role: 'user', content: 'hi', sources: null }]
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(data)))
      await store.loadMessages('s1')
      expect(store.messages.length).toBe(1)
      expect(store.messages[0].content).toBe('hi')
    })

    it('failure: keeps empty messages', async () => {
      const store = useChatStore()
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('fail'))
      await store.loadMessages('s1')
      expect(store.messages).toEqual([])
    })
  })

  describe('deleteSession', () => {
    it('deletes current session: removes and resets state', async () => {
      const store = useChatStore()
      store.sessions = [{ id: 's1', title: 'Test', createdAt: '2024-01-01' }]
      store.currentSessionId = 's1'
      store.messages = [{ id: 'm1', role: 'user', content: 'hi' }]
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))
      await store.deleteSession('s1')
      expect(store.sessions).toEqual([])
      expect(store.currentSessionId).toBeNull()
      expect(store.messages).toEqual([])
    })

    it('deletes non-current session: removes only from list', async () => {
      const store = useChatStore()
      store.sessions = [
        { id: 's1', title: 'A', createdAt: '2024-01-01' },
        { id: 's2', title: 'B', createdAt: '2024-01-02' },
      ]
      store.currentSessionId = 's1'
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))
      await store.deleteSession('s2')
      expect(store.sessions.length).toBe(1)
      expect(store.sessions[0].id).toBe('s1')
      expect(store.currentSessionId).toBe('s1')
    })
  })

  describe('sendMessage', () => {
    it('with no session: auto-creates session first', async () => {
      const store = useChatStore()
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response(JSON.stringify({ id: 's1' })))
        .mockResolvedValueOnce(
          createSSEResponse([{ type: 'done', content: 'ok', sources: [] }])
        )
      await store.sendMessage('hello')
      expect(store.currentSessionId).toBe('s1')
      expect(store.messages.length).toBe(2)
    })

    it('adds user message and assistant placeholder', async () => {
      const store = useChatStore()
      store.currentSessionId = 's1'
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        createSSEResponse([{ type: 'token', content: 'ok' }])
      )
      await store.sendMessage('hello')
      expect(store.messages[0].role).toBe('user')
      expect(store.messages[0].content).toBe('hello')
      expect(store.messages[1].role).toBe('assistant')
      expect(store.messages[1].isStreaming).toBe(true)
    })

    it('SSE token stream: appends content', async () => {
      const store = useChatStore()
      store.currentSessionId = 's1'
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        createSSEResponse([
          { type: 'token', content: 'he' },
          { type: 'token', content: 'llo' },
        ])
      )
      await store.sendMessage('hi')
      const assistant = store.messages[store.messages.length - 1]
      expect(assistant.content).toBe('hello')
    })

    it('SSE done: sets content, sources, isStreaming=false', async () => {
      const store = useChatStore()
      store.currentSessionId = 's1'
      const sources = [{ articleId: 1, title: 'T', categoryPath: '/', excerpt: 'E' }]
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        createSSEResponse([
          { type: 'token', content: 'ans' },
          { type: 'done', content: 'answer', sources },
        ])
      )
      await store.sendMessage('q')
      const assistant = store.messages[store.messages.length - 1]
      expect(assistant.content).toBe('answer')
      expect(assistant.sources).toEqual(sources)
      expect(assistant.isStreaming).toBe(false)
    })

    it('SSE error: sets error, isStreaming=false', async () => {
      const store = useChatStore()
      store.currentSessionId = 's1'
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        createSSEResponse([{ type: 'error', error: 'stream failed' }])
      )
      await store.sendMessage('q')
      expect(store.error).toBe('stream failed')
      const assistant = store.messages[store.messages.length - 1]
      expect(assistant.isStreaming).toBe(false)
    })

    it('network error: sets error', async () => {
      const store = useChatStore()
      store.currentSessionId = 's1'
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))
      await store.sendMessage('q')
      expect(store.error).toBe('network down')
    })

    it('non-2xx response: sets error', async () => {
      const store = useChatStore()
      store.currentSessionId = 's1'
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('err', { status: 500 }))
      await store.sendMessage('q')
      expect(store.error).toBe('Network response was not ok')
    })

    it('null response body: sets error', async () => {
      const store = useChatStore()
      store.currentSessionId = 's1'
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))
      await store.sendMessage('q')
      expect(store.error).toBe('No response body')
    })
  })
})
