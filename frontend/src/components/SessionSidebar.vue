<template>
  <div class="w-64 bg-[#0d1117] border-r border-[rgba(255,255,255,0.08)] flex flex-col h-full">
    <div class="p-4 border-b border-[rgba(255,255,255,0.08)]">
      <button
        @click="$emit('create')"
        class="w-full bg-gradient-to-r from-[#00d4ff] to-[#6366f1] text-white rounded-lg py-2 px-4 transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] hover:scale-[1.02]"
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
          'group flex items-center justify-between p-3 rounded-lg cursor-pointer mb-1 transition-all duration-200',
          currentSessionId === session.id
            ? 'bg-[rgba(0,212,255,0.08)] text-[#00d4ff] border-l-2 border-[#00d4ff]'
            : 'hover:bg-[rgba(255,255,255,0.05)] text-[#94a3b8]',
        ]"
        @click="$emit('select', session.id)"
      >
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate text-[#f1f5f9]">
            {{ session.title || '新对话' }}
          </p>
          <p class="text-xs text-[#64748b]">
            {{ formatDate(session.createdAt) }}
          </p>
        </div>

        <button
          @click.stop="$emit('delete', session.id)"
          class="opacity-0 group-hover:opacity-100 p-1 hover:bg-[rgba(239,68,68,0.2)] hover:text-[#ef4444] rounded transition-all duration-200"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      <div v-if="sessions.length === 0" class="text-center text-[#64748b] py-8 text-sm">
        暂无对话记录
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Session } from '../stores/chat'

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
