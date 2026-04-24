import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import SourcePanel from '@/components/SourcePanel.vue'
import type { Source } from '@/stores/chat'

describe('SourcePanel', () => {
  const createSource = (articleId: number, title: string, categoryPath: string, excerpt: string): Source => ({
    articleId,
    title,
    categoryPath,
    excerpt,
  })

  it('renders source count in button text', () => {
    const sources = [
      createSource(1, 'Title 1', '/category1', 'Excerpt 1'),
      createSource(2, 'Title 2', '/category2', 'Excerpt 2'),
    ]
    const wrapper = mount(SourcePanel, {
      props: { sources },
      global: { plugins: [] },
    })

    expect(wrapper.text()).toContain('引用来源 (2)')
  })

  it('sources list hidden by default', () => {
    const sources = [createSource(1, 'Title', '/category', 'Excerpt')]
    const wrapper = mount(SourcePanel, {
      props: { sources },
      global: { plugins: [] },
    })

    const sourceContainer = wrapper.find('.space-y-2')
    expect(sourceContainer.exists()).toBe(false)
  })

  it('click toggles expanded state - list visible after click', async () => {
    const sources = [createSource(1, 'Title', '/category', 'Excerpt')]
    const wrapper = mount(SourcePanel, {
      props: { sources },
      global: { plugins: [] },
    })

    const vm = wrapper.vm as any
    vm.expanded = true
    vm.$forceUpdate()
    await flushPromises()
    await wrapper.vm.$nextTick()

    const sourceContainer = wrapper.find('.space-y-2')
    expect(sourceContainer.exists()).toBe(true)
  })

  it('renders each source with title, categoryPath, excerpt', async () => {
    const sources = [
      createSource(1, 'Article Title', '/Help/FAQ', 'This is the article excerpt'),
    ]
    const wrapper = mount(SourcePanel, {
      props: { sources },
      global: { plugins: [] },
    })

    const vm = wrapper.vm as any
    vm.expanded = true
    vm.$forceUpdate()
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Article Title')
    expect(wrapper.text()).toContain('/Help/FAQ')
    expect(wrapper.text()).toContain('This is the article excerpt')
  })

  it('renders index badge with correct format', async () => {
    const sources = [
      createSource(1, 'First', '/cat1', 'Excerpt 1'),
      createSource(2, 'Second', '/cat2', 'Excerpt 2'),
    ]
    const wrapper = mount(SourcePanel, {
      props: { sources },
      global: { plugins: [] },
    })

    const vm = wrapper.vm as any
    vm.expanded = true
    vm.$forceUpdate()
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('[^1]')
    expect(wrapper.text()).toContain('[^2]')
  })
})
