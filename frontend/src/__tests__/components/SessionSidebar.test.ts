import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SessionSidebar from '@/components/SessionSidebar.vue'
import type { Session } from '@/stores/chat'

describe('SessionSidebar', () => {
  const createSession = (id: string, title: string, createdAt: string): Session => ({
    id,
    title,
    createdAt,
  })

  describe('renders session list with titles', () => {
    it('displays session titles', () => {
      const sessions = [
        createSession('1', 'Session One', '2024-01-15T10:00:00Z'),
        createSession('2', 'Session Two', '2024-01-16T14:30:00Z'),
      ]
      const wrapper = mount(SessionSidebar, {
        props: { sessions, currentSessionId: null },
      })

      expect(wrapper.text()).toContain('Session One')
      expect(wrapper.text()).toContain('Session Two')
    })

    it('displays "新对话" as title when session title is empty', () => {
      const sessions = [createSession('1', '', '2024-01-15T10:00:00Z')]
      const wrapper = mount(SessionSidebar, {
        props: { sessions, currentSessionId: null },
      })

      expect(wrapper.text()).toContain('新对话')
    })
  })

  describe('highlights current session with accent styling', () => {
    it('applies accent styling to current session', () => {
      const sessions = [
        createSession('1', 'Session One', '2024-01-15T10:00:00Z'),
        createSession('2', 'Session Two', '2024-01-16T14:30:00Z'),
      ]
      const wrapper = mount(SessionSidebar, {
        props: { sessions, currentSessionId: '1' },
      })

      const currentSessionEl = wrapper.findAll('.group')[0]
      expect(currentSessionEl?.exists()).toBe(true)
      expect(currentSessionEl?.classes().join(' ')).toMatch(/border-l/)
    })

    it('does not apply accent styling to non-current sessions', () => {
      const sessions = [
        createSession('1', 'Session One', '2024-01-15T10:00:00Z'),
        createSession('2', 'Session Two', '2024-01-16T14:30:00Z'),
      ]
      const wrapper = mount(SessionSidebar, {
        props: { sessions, currentSessionId: '1' },
      })

      const nonCurrentSessionEl = wrapper.findAll('.group')[1]
      expect(nonCurrentSessionEl?.classes().join(' ')).not.toMatch(/border-l/)
    })
  })

  describe('emits events', () => {
    it('emits select event with session id on session click', async () => {
      const sessions = [createSession('1', 'Session One', '2024-01-15T10:00:00Z')]
      const wrapper = mount(SessionSidebar, {
        props: { sessions, currentSessionId: null },
      })

      await wrapper.find('.group').trigger('click')

      expect(wrapper.emitted()).toHaveProperty('select')
      expect(wrapper.emitted('select')![0]).toEqual(['1'])
    })

    it('emits create event on "新对话" button click', async () => {
      const wrapper = mount(SessionSidebar, {
        props: { sessions: [], currentSessionId: null },
      })

      await wrapper.find('button').trigger('click')

      expect(wrapper.emitted()).toHaveProperty('create')
      expect(wrapper.emitted('create')).toBeTruthy()
    })

    it('emits delete event with session id on delete button click', async () => {
      const sessions = [createSession('1', 'Session One', '2024-01-15T10:00:00Z')]
      const wrapper = mount(SessionSidebar, {
        props: { sessions, currentSessionId: null },
      })

      // Hover to make delete button visible
      await wrapper.find('.group').trigger('mouseenter')
      await wrapper.find('.group button').trigger('click')

      expect(wrapper.emitted()).toHaveProperty('delete')
      expect(wrapper.emitted('delete')![0]).toEqual(['1'])
    })
  })

  describe('shows "暂无对话记录" when sessions empty', () => {
    it('displays empty state message', () => {
      const wrapper = mount(SessionSidebar, {
        props: { sessions: [], currentSessionId: null },
      })

      expect(wrapper.text()).toContain('暂无对话记录')
    })
  })

  describe('formatDate helper', () => {
    it('produces expected formatted output', () => {
      const sessions = [createSession('1', 'Test', '2024-01-15T10:30:00Z')]
      const wrapper = mount(SessionSidebar, {
        props: { sessions, currentSessionId: null },
      })

      const formattedText = wrapper.text()
      // Should contain date parts regardless of timezone
      expect(formattedText).toMatch(/1/)
      expect(formattedText).toMatch(/15/)
      expect(formattedText).toMatch(/\d{1,2}:\d{2}/)
    })
  })
})
