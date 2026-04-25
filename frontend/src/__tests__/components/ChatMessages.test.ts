import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import ChatMessages from '@/components/ChatMessages.vue'
import type { Message } from '@/stores/chat'

describe('ChatMessages.vue', () => {
  it('renders nothing when messages empty', () => {
    const wrapper = shallowMount(ChatMessages, {
      props: { messages: [] as Message[] },
    })
    expect(wrapper.text().trim()).toBe('')
  })

  it('renders user message with U avatar and blue styling', () => {
    const messages: Message[] = [{ id: 'm1', role: 'user', content: 'Hi' }]
    const wrapper = shallowMount(ChatMessages, { props: { messages } })
    const avatarBlue = wrapper.find('.bg-blue-600')
    expect(avatarBlue.exists()).toBe(true)
    expect(avatarBlue.text()).toBe('U')
    const bubble = wrapper.findAll('.bg-blue-600')[1]
    expect(bubble).not.toBe(null)
    expect(bubble?.text()).toContain('Hi')
  })

  it('renders assistant message with AI avatar and white styling', () => {
    const messages: Message[] = [{ id: 'm2', role: 'assistant', content: 'Hello' }]
    const wrapper = shallowMount(ChatMessages, { props: { messages } })
    const avatarAI = wrapper.find('.bg-gray-200')
    expect(avatarAI.exists()).toBe(true)
    expect(avatarAI.text()).toBe('AI')
    const bubbleAI = wrapper.find('.bg-white')
    expect(bubbleAI.exists()).toBe(true)
    expect(bubbleAI.text()).toContain('Hello')
  })

  it('shows streaming indicator when isStreaming=true', () => {
    const messages: Message[] = [
      { id: 'm3', role: 'assistant', content: 'Typing...', isStreaming: true },
    ]
    const wrapper = shallowMount(ChatMessages, { props: { messages } })
    const indicator = wrapper.find('.animate-pulse')
    expect(indicator.exists()).toBe(true)
  })

  it('hides streaming indicator when isStreaming=false', () => {
    const messages: Message[] = [
      { id: 'm4', role: 'assistant', content: 'Done', isStreaming: false },
    ]
    const wrapper = shallowMount(ChatMessages, { props: { messages } })
    const indicator = wrapper.find('.animate-pulse')
    expect(indicator.exists()).toBe(false)
  })

  it('shows SourcePanel when assistant has sources and !isStreaming', () => {
    const messages: Message[] = [
      {
        id: 'm5',
        role: 'assistant',
        content: 'Here are sources',
        isStreaming: false,
        sources: [{ articleId: 1, title: 'Source 1', categoryPath: '/', excerpt: 'E' }],
      },
    ]
    const wrapper = shallowMount(ChatMessages, { props: { messages } })
    const hasSourcePanel = wrapper.findComponent({ name: 'SourcePanel' }).exists()
    expect(hasSourcePanel).toBe(true)
  })

  it('hides SourcePanel for user messages', () => {
    const messages: Message[] = [{ id: 'm6', role: 'user', content: 'User says hi' }]
    const wrapper = shallowMount(ChatMessages, { props: { messages } })
    const hasSourcePanel = wrapper.findComponent({ name: 'SourcePanel' }).exists()
    expect(hasSourcePanel).toBe(false)
  })

  it('hides SourcePanel when sources array is empty', () => {
    const messages: Message[] = [
      {
        id: 'm7',
        role: 'assistant',
        content: 'No sources',
        sources: [],
        isStreaming: false,
      },
    ]
    const wrapper = shallowMount(ChatMessages, { props: { messages } })
    const hasSourcePanel = wrapper.findComponent({ name: 'SourcePanel' }).exists()
    expect(hasSourcePanel).toBe(false)
  })
})
