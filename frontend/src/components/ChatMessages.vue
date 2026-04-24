<template>
  <div class="space-y-4 max-w-3xl mx-auto">
    <div
      v-for="message in messages"
      :key="message.id"
      :class="[
        'flex gap-3',
        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
      ]"
    >
      <!-- Avatar -->
      <div
        :class="[
          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0',
          message.role === 'user'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-600'
        ]"
      >
        {{ message.role === 'user' ? 'U' : 'AI' }}
      </div>

      <!-- Content -->
      <div
        :class="[
          'max-w-[80%] rounded-2xl px-4 py-3',
          message.role === 'user'
            ? 'bg-blue-600 text-white'
            : 'bg-white border shadow-sm'
        ]"
      >
        <div
          :class="[
            'text-sm leading-relaxed whitespace-pre-wrap',
            message.role === 'user' ? 'text-white' : 'text-gray-800'
          ]"
        >
          {{ message.content }}
          <span v-if="message.isStreaming" class="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1"></span>
        </div>

        <!-- Sources -->
        <SourcePanel
          v-if="message.role === 'assistant' && message.sources && message.sources.length > 0 && !message.isStreaming"
          :sources="message.sources"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Message } from '../stores/chat'
import SourcePanel from './SourcePanel.vue'

defineProps<{
  messages: Message[]
}>()
</script>
