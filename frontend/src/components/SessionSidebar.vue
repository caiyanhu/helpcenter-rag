<template>
  <div class="w-64 bg-white border-r flex flex-col h-full">
    <div class="p-4 border-b">
      <button
        @click="$emit('create')"
        class="w-full bg-blue-600 text-white rounded-lg py-2 px-4 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
      >
        <span>+</span>
        <span>新对话</span>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-2">
      <div
        v-for="session in sessions"
        :key="session.id"
        :class="[
          'group flex items-center justify-between p-3 rounded-lg cursor-pointer mb-1',
          currentSessionId === session.id
            ? 'bg-blue-50 text-blue-700'
            : 'hover:bg-gray-100 text-gray-700'
        ]"
        @click="$emit('select', session.id)"
      >
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">
            {{ session.title || '新对话' }}
          </p>
          <p class="text-xs text-gray-400">
            {{ formatDate(session.createdAt) }}
          </p>
        </div>

        <button
          @click.stop="$emit('delete', session.id)"
          class="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 hover:text-red-600 rounded transition-all"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div v-if="sessions.length === 0" class="text-center text-gray-400 py-8 text-sm">
        暂无对话记录
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Session } from '../stores/chat.store.js'

defineProps<{
  sessions: Session[]
  currentSessionId: string | null
}>()

defineEmits<{
  select: [sessionId: string]
  create: []
  delete: [sessionId: string]
}>()

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>
