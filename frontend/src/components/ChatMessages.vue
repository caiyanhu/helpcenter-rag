<template>
  <div class="space-y-6 max-w-3xl mx-auto">
    <div
      v-for="message in messages"
      :key="message.id"
      :class="['flex gap-3', message.role === 'user' ? 'flex-row-reverse' : 'flex-row']"
    >
      <!-- Avatar -->
      <div
        :class="[
          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0',
          message.role === 'user'
            ? 'bg-[#00d4ff] text-white'
            : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white',
        ]"
      >
        {{ message.role === 'user' ? 'U' : 'AI' }}
      </div>

      <!-- Content -->
      <div
        :class="[
          'max-w-[80%] rounded-2xl px-4 py-3',
          message.role === 'user'
            ? 'bg-gradient-to-br from-accent-primary to-indigo-500 text-white'
            : 'bg-slate-800/80 backdrop-blur border border-slate-700/50 text-slate-100',
        ]"
      >
        <div
          :class="[
            'text-sm leading-relaxed whitespace-pre-wrap',
            message.role === 'user' ? 'text-white' : 'text-slate-100',
          ]"
        >
          {{ message.content }}
          <span v-if="message.isStreaming" class="streaming-cursor animate-pulse-glow" />
        </div>

        <!-- Sources -->
        <SourcePanel
          v-if="
            message.role === 'assistant' &&
            message.sources &&
            message.sources.length > 0 &&
            !message.isStreaming
          "
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

<style scoped>
.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background-color: #00d4ff;
  margin-left: 4px;
  animation: cursor-blink 1s infinite;
  box-shadow: 0 0 8px rgba(0, 212, 255, 0.6);
}

@keyframes cursor-blink {
  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 8px rgba(0, 212, 255, 0.6);
  }
  50% {
    opacity: 0.3;
    box-shadow: 0 0 4px rgba(0, 212, 255, 0.3);
  }
}
</style>
