import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  isStreaming?: boolean
}

export interface Source {
  articleId: number
  title: string
  categoryPath: string
  excerpt: string
}

export interface Session {
  id: string
  title: string
  createdAt: string
}

export const useChatStore = defineStore('chat', () => {
  const sessions = ref<Session[]>([])
  const currentSessionId = ref<string | null>(null)
  const messages = ref<Message[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const currentSession = computed(() =>
    sessions.value.find(s => s.id === currentSessionId.value)
  )

  async function loadSessions() {
    try {
      const response = await fetch('/api/sessions')
      sessions.value = await response.json()
    } catch (e) {
      console.error('Failed to load sessions:', e)
    }
  }

  async function createSession() {
    try {
      const response = await fetch('/api/sessions', { method: 'POST' })
      const data = await response.json()
      const newSession: Session = {
        id: data.id,
        title: '新对话',
        createdAt: new Date().toISOString(),
      }
      sessions.value.unshift(newSession)
      currentSessionId.value = newSession.id
      messages.value = []
      return newSession.id
    } catch (e) {
      console.error('Failed to create session:', e)
      return null
    }
  }

  async function loadMessages(sessionId: string) {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/messages`)
      const data = await response.json()
      messages.value = data.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources,
      }))
    } catch (e) {
      console.error('Failed to load messages:', e)
    }
  }

  async function deleteSession(sessionId: string) {
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
      sessions.value = sessions.value.filter(s => s.id !== sessionId)
      if (currentSessionId.value === sessionId) {
        currentSessionId.value = null
        messages.value = []
      }
    } catch (e) {
      console.error('Failed to delete session:', e)
    }
  }

  async function sendMessage(content: string) {
    if (!currentSessionId.value) {
      const newId = await createSession()
      if (!newId) return
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
    }
    messages.value.push(userMessage)

    // Add assistant placeholder
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      isStreaming: true,
    }
    messages.value.push(assistantMessage)

    isLoading.value = true
    error.value = null

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId.value,
          message: content,
        }),
      })

      if (!response.ok) {
        throw new Error('Network response was not ok')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE events
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.data?.type === 'token') {
                assistantMessage.content += data.data.content
              } else if (data.data?.type === 'done') {
                assistantMessage.content = data.data.content
                assistantMessage.sources = data.data.sources
                assistantMessage.isStreaming = false
              } else if (data.data?.type === 'error') {
                error.value = data.data.error
                assistantMessage.isStreaming = false
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (e: any) {
      error.value = e.message || '发送消息失败'
      assistantMessage.isStreaming = false
    } finally {
      isLoading.value = false
    }
  }

  return {
    sessions,
    currentSessionId,
    messages,
    isLoading,
    error,
    currentSession,
    loadSessions,
    createSession,
    loadMessages,
    deleteSession,
    sendMessage,
  }
})
