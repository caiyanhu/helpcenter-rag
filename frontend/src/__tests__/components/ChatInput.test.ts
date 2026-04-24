import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatInput from '@/components/ChatInput.vue'
import { nextTick } from 'vue'

describe('ChatInput.vue', () => {
  it('renders textarea and send button', () => {
    const wrapper = mount(ChatInput, { props: { loading: false } })
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('button disabled when input empty', () => {
    const wrapper = mount(ChatInput, { props: { loading: false } })
    expect(wrapper.find('button').element.disabled).toBe(true)
  })

  it('button disabled when loading', () => {
    const wrapper = mount(ChatInput, { props: { loading: true } })
    expect(wrapper.find('button').element.disabled).toBe(true)
  })

  it('typing updates textarea value', async () => {
    const wrapper = mount(ChatInput, { props: { loading: false } })
    const ta = wrapper.find('textarea')
    await ta.setValue('Hello')
    expect(ta.element.value).toBe('Hello')
  })

  it('send emits trimmed content', async () => {
    const wrapper = mount(ChatInput, { props: { loading: false } })
    const vm = wrapper.vm as any
    vm.input = '  hi  '
    await nextTick()
    vm.send()
    const emits = wrapper.emitted('send')
    expect(emits).toBeTruthy()
    expect(emits?.[0]?.[0]).toBe('hi')
  })

  it('Shift+Enter does NOT emit', async () => {
    const wrapper = mount(ChatInput, { props: { loading: false } })
    const ta = wrapper.find('textarea')
    await ta.setValue('test')
    await ta.trigger('keydown', { key: 'Enter', shiftKey: true })
    expect(wrapper.emitted('send')).toBeFalsy()
  })

  it('After send, input is cleared', async () => {
    const wrapper = mount(ChatInput, { props: { loading: false } })
    const vm = wrapper.vm as any
    vm.input = 'clear'
    await nextTick()
    vm.send()
    expect(vm.input).toBe('')
  })

  it('Empty/whitespace-only input: no emit', async () => {
    const wrapper = mount(ChatInput, { props: { loading: false } })
    const vm = wrapper.vm as any
    vm.input = '   '
    await nextTick()
    vm.send()
    expect(wrapper.emitted('send')).toBeFalsy()
  })

  it('Spinner renders when loading', () => {
    const wrapper = mount(ChatInput, { props: { loading: true } })
    expect(wrapper.find('.animate-spin').exists()).toBe(true)
  })
})
